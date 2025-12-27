import { ConnectButton } from '@rainbow-me/rainbowkit';

type HeaderProps = {
  onUploadClick: () => void;
};

export function Header({ onUploadClick }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__content">
        <div>
          <h1 className="app-title">CipherDrive</h1>
          <p className="app-subtitle">Encrypt, register, and decrypt file access keys with FHE</p>
        </div>
        <div className="app-header__actions">
          <button type="button" className="header-upload-button" onClick={onUploadClick}>
            Upload
          </button>
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
