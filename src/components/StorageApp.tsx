'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Contract, Wallet, getBytes, hexlify } from 'ethers';
import type { JsonRpcSigner } from 'ethers';
import type { Address } from 'viem';

import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { decryptHashWithAddress, encryptHashWithAddress } from '../lib/encryption';
import { Header } from './Header';

type PreparedFile = {
  file: File;
};

type StoredFile = {
  id: bigint;
  filename: string;
  encryptedHash: string;
  encryptedAccount: string;
  owner: Address;
  createdAt: bigint;
};

type DecryptedRecord = {
  address: string;
  hash: string;
};

export function StorageApp() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [showUploadForm, setShowUploadForm] = useState(false);
  const [prepared, setPrepared] = useState<PreparedFile | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStoring, setIsStoring] = useState(false);
  const [decryptingId, setDecryptingId] = useState<bigint | null>(null);
  const [decrypted, setDecrypted] = useState<Record<string, DecryptedRecord>>({});
  const [downloadingId, setDownloadingId] = useState<bigint | null>(null);

  useEffect(() => {
    if (showUploadForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showUploadForm]);

  const {
    data: filesData,
    refetch: refetchFiles,
    isFetching: isFetchingFiles,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getFiles',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const files = useMemo<StoredFile[]>(() => {
    if (!filesData) {
      return [];
    }

    const raw = filesData as readonly {
      id: bigint;
      filename: string;
      encryptedHash: string;
      encryptedAccount: string;
      owner: Address;
      createdAt: bigint;
    }[];
    return raw
      .map((item) => ({
        id: item.id,
        filename: item.filename,
        encryptedHash: item.encryptedHash,
        encryptedAccount: item.encryptedAccount,
        owner: item.owner,
        createdAt: item.createdAt,
      }))
      .sort((a, b) => {
        // Sort by createdAt descending (newest first)
        if (a.createdAt > b.createdAt) return -1;
        if (a.createdAt < b.createdAt) return 1;
        return 0;
      });
  }, [filesData]);

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getErrorMessage = (err: unknown): string => {
    if (!(err instanceof Error)) {
      return 'An unexpected error occurred';
    }

    const errorMessage = err.message.toLowerCase();
    const errorCode = (err as any).code;
    const errorReason = (err as any).reason;

    if (
      errorCode === 4001 ||
      errorReason === 'rejected' ||
      errorMessage.includes('user rejected') ||
      errorMessage.includes('user denied') ||
      errorMessage.includes('action_rejected') ||
      errorMessage.includes('ethers-user-denied')
    ) {
      return 'Transaction was cancelled. Please try again when you are ready.';
    }

    if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
      return 'Insufficient funds. Please ensure you have enough ETH to cover the transaction fee.';
    }

    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return 'Network error. Please check your connection and try again.';
    }

    return err.message || 'An error occurred. Please try again.';
  };

  const uploadToPinata = useCallback(async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to upload: ${response.statusText}`);
    }

    const result = await response.json();
    return result.cid;
  }, []);

  const downloadFromIPFS = useCallback(async (cid: string, filename: string): Promise<void> => {
    const url = `/api/ipfs/download?cid=${encodeURIComponent(cid)}&filename=${encodeURIComponent(filename)}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to download: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  }, []);

  const getIPFSGateway = useCallback(async (cid: string): Promise<string> => {
    const response = await fetch(`/api/ipfs/gateway?cid=${encodeURIComponent(cid)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to get gateway: ${response.statusText}`);
    }

    const result = await response.json();
    return result.gateway;
  }, []);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const prepareFile = useCallback(async (file: File) => {
    setError(null);
    setStatus(null);

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB. Please select a smaller file.`);
      setPrepared(null);
      return;
    }

    setPrepared({
      file,
    });
  }, []);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      if (!file) {
        setPrepared(null);
        setStatus(null);
        return;
      }
      prepareFile(file);
    },
    [prepareFile],
  );

  const storePreparedFile = useCallback(async () => {
    if (!prepared) {
      setError('Select a file first.');
      return;
    }
    if (!address) {
      setError('Connect your wallet to store files.');
      return;
    }
    if (!instance) {
      setError('Encryption service is not ready yet.');
      return;
    }
    const signer = (await signerPromise) as JsonRpcSigner | undefined;
    if (!signer) {
      setError('Wallet signer not available.');
      return;
    }

    setIsStoring(true);
    setStatus('Uploading file to IPFS...');
    setError(null);

    try {
      const cid = await uploadToPinata(prepared.file);
      setStatus('File uploaded to IPFS. Encrypting metadata...');
      
      const wallet = Wallet.createRandom();
      const encryptedPayload = await encryptHashWithAddress(wallet.address, cid);

      setStatus('Encrypting access key with Zama relayer...');
      const buffer = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      buffer.addAddress(wallet.address);
      const encryptedInput = await buffer.encrypt();

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.storeFile(
        prepared.file.name,
        getBytes(encryptedPayload),
        hexlify(encryptedInput.handles[0]),
        encryptedInput.inputProof,
      );

      setStatus('Waiting for transaction confirmation...');
      await tx.wait();
      setStatus('Stored file metadata on-chain.');
      
      await refetchFiles();
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await refetchFiles();
      
      setPrepared(null);
      resetFileInput();
      setTimeout(() => {
        setStatus(null);
        setShowUploadForm(false);
      }, 2000);
    } catch (err) {
      console.error(err);
      const message = getErrorMessage(err);
      setError(message);
    } finally {
      setIsStoring(false);
    }
  }, [prepared, address, instance, signerPromise, refetchFiles, uploadToPinata]);

  const decryptRecord = useCallback(
    async (record: StoredFile) => {
      if (!instance || !address) {
        setError('Connect wallet and wait for encryption service.');
        return;
      }
      const signer = (await signerPromise) as JsonRpcSigner | undefined;
      if (!signer) {
        setError('Wallet signer not available.');
        return;
      }

      setDecryptingId(record.id);
      setError(null);

      try {
        const keypair = instance.generateKeypair();
        const startTimestamp = Math.floor(Date.now() / 1000).toString();
        const durationDays = '7';
        const contractAddresses = [CONTRACT_ADDRESS];
        const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);

        const signature = await signer.signTypedData(
          eip712.domain,
          { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
          eip712.message,
        );

        const result = await instance.userDecrypt(
          [{ handle: record.encryptedAccount, contractAddress: CONTRACT_ADDRESS }],
          keypair.privateKey,
          keypair.publicKey,
          signature.replace(/^0x/, ''),
          contractAddresses,
          address,
          startTimestamp,
          durationDays,
        );

        const decryptedAddress = result[record.encryptedAccount];
        if (!decryptedAddress) {
          throw new Error('Decryption result is empty.');
        }

        const hash = await decryptHashWithAddress(decryptedAddress.toString(), record.encryptedHash);
        setDecrypted((prev) => ({
          ...prev,
          [record.id.toString()]: { address: decryptedAddress.toString(), hash },
        }));
      } catch (err) {
        console.error(err);
        const message = getErrorMessage(err);
        setError(message);
      } finally {
        setDecryptingId(null);
      }
    },
    [instance, address, signerPromise],
  );

  const handleDownload = useCallback(
    async (file: StoredFile, cid: string) => {
      setDownloadingId(file.id);
      setError(null);
      setStatus('Downloading file from IPFS...');

      try {
        await downloadFromIPFS(cid, file.filename);
        setStatus('File downloaded successfully.');
        setTimeout(() => setStatus(null), 2000);
      } catch (err) {
        console.error(err);
        const message = err instanceof Error ? err.message : 'Failed to download file';
        setError(message);
      } finally {
        setDownloadingId(null);
      }
    },
    [],
  );

  const handleCopyIPFSLink = useCallback(
    async (cid: string) => {
      try {
        const gateway = await getIPFSGateway(cid);
        await navigator.clipboard.writeText(gateway);
        setStatus('IPFS link copied to clipboard!');
        setTimeout(() => setStatus(null), 2000);
      } catch (err) {
        console.error(err);
        setError('Failed to copy link to clipboard');
      }
    },
    [],
  );

  const renderPreparedSummary = () => {
    if (!prepared) {
      return null;
    }

    return (
      <div className="card">
        <h3>Selected File</h3>
        <dl className="details-grid">
          <div>
            <dt>Filename</dt>
            <dd>{prepared.file.name}</dd>
          </div>
          <div>
            <dt>File Size</dt>
            <dd>
              {prepared.file.size >= 1024 * 1024
                ? `${(prepared.file.size / (1024 * 1024)).toFixed(2)} MB`
                : `${(prepared.file.size / 1024).toFixed(2)} KB`}
            </dd>
          </div>
        </dl>
      </div>
    );
  };

  return (
    <div className="app-wrapper">
      <Header onUploadClick={() => setShowUploadForm(true)} />

      <main className="app-main">
        {showUploadForm && (
          <>
            <div 
              className="modal-overlay"
              onClick={() => {
                setShowUploadForm(false);
                setPrepared(null);
                setStatus(null);
                setError(null);
                resetFileInput();
              }}
            />
            <div className="modal-container">
              <section className="card upload-card modal-content">
                <div className="upload-card__header">
                  <h2>Upload File</h2>
                  <button
                    type="button"
                    className="close-button"
                    onClick={() => {
                      setShowUploadForm(false);
                      setPrepared(null);
                      setStatus(null);
                      setError(null);
                      resetFileInput();
                    }}
                    aria-label="Close upload form"
                  >
                    ×
                  </button>
                </div>
                <p className="section-description">
                  Select a file to upload. When you click Upload, the file will be uploaded to IPFS,
                  then the IPFS hash (CID) will be encrypted with a random address and stored on-chain.
                </p>

                {prepared ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{prepared.file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPrepared(null);
                        setStatus(null);
                        resetFileInput();
                      }}
                      disabled={isStoring}
                      style={{
                        background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: isStoring ? 'not-allowed' : 'pointer',
                        padding: 0,
                        fontSize: '1.25rem',
                        lineHeight: 1,
                        color: 'var(--accent-error)',
                        opacity: isStoring ? 0.5 : 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => {
                        if (!isStoring) {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                          e.currentTarget.style.borderColor = 'var(--accent-error)';
                          e.currentTarget.style.transform = 'scale(1.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      aria-label="Clear selection"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <label className="file-picker" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                     <input ref={fileInputRef} type="file" onChange={handleFileChange} disabled={isStoring} style={{ textAlign: 'center' }} />
                  </label>
                )}

                {status && <p className="status-message">{status}</p>}
                {error && <p className="error-message">{error}</p>}
                {zamaError && <p className="error-message">{zamaError}</p>}

                {renderPreparedSummary()}

                <div className="actions-row" style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={storePreparedFile}
                    disabled={!prepared || zamaLoading || isStoring}
                  >
                    {zamaLoading ? 'Connecting to relayer...' : isStoring ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </section>
            </div>
          </>
        )}

        <section className="card">
          <div className="section-heading">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
              <h2 style={{ margin: 0 }}>Files</h2>
              {address && (
                <button
                  type="button"
                  onClick={() => refetchFiles()}
                  disabled={isFetchingFiles}
                  title="Reload files list"
                  style={{
                    marginLeft: 'auto',
                    background: 'none',
                    border: 'none',
                    cursor: isFetchingFiles ? 'not-allowed' : 'pointer',
                    padding: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isFetchingFiles ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {isFetchingFiles ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffd208"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ animation: 'spin 1s linear infinite' }}
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ffd208"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                      <path d="M21 3v5h-5" />
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                      <path d="M3 21v-5h5" />
                    </svg>
                  )}
                </button>
              )}
            </div>
            {address ? null : <p className="section-description">Connect your wallet to view stored files.</p>}
          </div>

          {address && (
            <div className="files-list">
              {isFetchingFiles ? (
                <p className="status-message">Loading encrypted records...</p>
              ) : files.length === 0 ? (
                <div className="empty-state">
                  <p className="status-message">No files stored yet.</p>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => setShowUploadForm(true)}
                    style={{ marginTop: '1rem' }}
                  >
                    Upload your first file
                  </button>
                </div>
              ) : (
                files.map((file) => {
                  const decryptedRecord = decrypted[file.id.toString()];
                  return (
                    <article key={file.id.toString()} className="file-row">
                      <div className="file-row__meta">
                        <h3>{file.filename}</h3>
                        <p className="file-row__date">
                          Stored {new Date(Number(file.createdAt) * 1000).toLocaleString()}
                        </p>
                       
                      </div>
                      <div className="file-row__actions">
                        {decryptedRecord ? (
                          <div className="decrypted-panel">
                            <p className="mono">Decrypted address: {decryptedRecord.address}</p>
                            <p className="mono">Recovered IPFS hash: {decryptedRecord.hash}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className="primary-button"
                                onClick={() => handleDownload(file, decryptedRecord.hash)}
                                disabled={downloadingId === file.id}
                              >
                                {downloadingId === file.id ? 'Downloading...' : '⬇️ Download File'}
                              </button>
                              <button
                                type="button"
                                className="secondary-button"
                                onClick={() => handleCopyIPFSLink(decryptedRecord.hash)}
                                title="Copy IPFS gateway link"
                              >
                                📋 Copy IPFS Link
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="primary-button"
                            onClick={() => decryptRecord(file)}
                            disabled={decryptingId === file.id || zamaLoading}
                          >
                            {decryptingId === file.id ? 'Decrypting...' : 'Decrypt access' }
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
