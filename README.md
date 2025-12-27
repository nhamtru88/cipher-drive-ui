# Confidential Storage UI

A Next.js web application for secure file storage using Zama FHE (Fully Homomorphic Encryption), IPFS, and blockchain.

## Features

- 🔐 **Secure Encryption**: Uses Zama FHE Relayer SDK to encrypt metadata with Fully Homomorphic Encryption
- 📦 **Decentralized Storage**: Upload files to IPFS through Pinata
- ⛓️ **Blockchain**: Store encrypted metadata on Ethereum smart contract
- 🔑 **Access Control**: Only the owner can decrypt and access files
- 💼 **Wallet Integration**: Integrated with RainbowKit and Wagmi to connect Ethereum wallets

## Tech Stack

- **Framework**: Next.js 15
- **UI**: React 19
- **Blockchain**: 
  - Wagmi v2
  - Viem
  - Ethers.js v6
  - RainbowKit
- **Encryption**: Zama FHE Relayer SDK
- **Storage**: IPFS (Pinata)
- **Language**: TypeScript

## Requirements

- Node.js 21+
- npm or yarn
- Ethereum wallet (MetaMask, WalletConnect, etc.)
- Pinata account (for uploading files to IPFS)

## Installation

1. Clone the repository:
```bash
git clone git@github.com-movex8888:nhamtru88/cipher-drive-ui.git
cd cipher-drive-ui
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file with the necessary environment variables:
```env
# Pinata API keys (if needed)
PINATA_JWT=your_pinata_jwt_token
PINATA_GATEWAY=your_pinata_gateway_url

# Zama Relayer (if custom configuration is needed)
ZAMA_RELAYER_URL=https://relayer.zama.ai
```

4. Run the development server:
```bash
npm run dev
```

5. Open your browser at [http://localhost:3000](http://localhost:3000)

## Project Structure

```
ui/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── ipfs/         # IPFS upload/download endpoints
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── providers.tsx     # React providers (Wagmi, QueryClient)
├── src/
│   ├── components/       # React components
│   │   ├── Header.tsx
│   │   └── StorageApp.tsx
│   ├── config/          # Configuration files
│   │   ├── contracts.ts # Smart contract ABI & address
│   │   └── wagmi.ts     # Wagmi configuration
│   ├── hooks/           # Custom React hooks
│   │   ├── useEthersSigner.ts
│   │   └── useZamaInstance.ts
│   └── lib/             # Utility functions
│       └── encryption.ts
└── public/              # Static assets
```

## Usage

### Upload a File

1. Connect your Ethereum wallet
2. Click the "Upload" button or "Upload your first file"
3. Select the file you want to upload (maximum 10MB)
4. Click "Upload" to start the process:
   - File is uploaded to IPFS via Pinata
   - IPFS hash (CID) is encrypted with a random address
   - The random address is encrypted using Zama FHE
   - Metadata is stored on the smart contract

### View and Download Files

1. Your file list will be displayed after connecting your wallet
2. Click "Decrypt access" to decrypt the metadata
3. After successful decryption, you can:
   - Download the file from IPFS
   - Copy the IPFS gateway link

## Smart Contract

- **Contract Address**: `0x36bcD537F9e0bdD0Fe1c7544cB76ABd426120902`
- **Network**: Ethereum (or network configured in `wagmi.ts`)

### Contract Functions

- `storeFile(filename, encryptedHash, encryptedAccountHandle, encryptedAccountProof)`: Store encrypted file metadata
- `getFiles(account)`: Get list of files for an account
- `getFile(fileId)`: Get detailed information of a file

## API Routes

### `/api/ipfs/upload`
Upload a file to IPFS via Pinata.

**Method**: POST  
**Body**: FormData with `file` field

**Response**:
```json
{
  "cid": "Qm..."
}
```

### `/api/ipfs/download`
Download a file from IPFS.

**Method**: GET  
**Query Params**: 
- `cid`: IPFS Content ID
- `filename`: File name for download

### `/api/ipfs/gateway`
Get IPFS gateway URL.

**Method**: GET  
**Query Params**: 
- `cid`: IPFS Content ID

**Response**:
```json
{
  "gateway": "https://..."
}
```

## Build and Deploy

### Build for Production

```bash
npm run build
```

### Deploy to Netlify

The project is pre-configured for Netlify in the `netlify.toml` file.

1. Push code to GitHub
2. Connect the repository to Netlify
3. Netlify will automatically build and deploy

## Security Notes

- Files are stored on IPFS (public), but only the IPFS hash is encrypted and stored on the blockchain
- Only the owner (the uploader) can decrypt and access files
- Wallet private keys must be kept secure
- Zama FHE relayer handles encryption/decryption, ensuring high security

## License

Private repository - All rights reserved

## Contact

- Repository: [cipher-drive-ui](https://github.com/nhamtru88/cipher-drive-ui)
- Email: movexmanager8888@gmail.com
