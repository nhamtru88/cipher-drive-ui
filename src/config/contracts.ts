import type { Address } from "viem";

export const CONTRACT_ADDRESS = "0x36bcD537F9e0bdD0Fe1c7544cB76ABd426120902" as Address;

export const CONTRACT_ABI = [
  {
    inputs: [],
    name: "EmptyFilename",
    type: "error",
  },
  {
    inputs: [],
    name: "EmptyHash",
    type: "error",
  },
  {
    inputs: [],
    name: "FileNotFound",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint256",
        name: "id",
        type: "uint256",
      },
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: false,
        internalType: "string",
        name: "filename",
        type: "string",
      },
    ],
    name: "FileStored",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "fileId",
        type: "uint256",
      },
    ],
    name: "getFile",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "id",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "filename",
            type: "string",
          },
          {
            internalType: "bytes",
            name: "encryptedHash",
            type: "bytes",
          },
          {
            internalType: "bytes32",
            name: "encryptedAccount",
            type: "bytes32",
          },
          {
            internalType: "address",
            name: "owner",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "createdAt",
            type: "uint256",
          },
        ],
        internalType: "struct ConfidentialStorage.FileView",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "getFiles",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "id",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "filename",
            type: "string",
          },
          {
            internalType: "bytes",
            name: "encryptedHash",
            type: "bytes",
          },
          {
            internalType: "bytes32",
            name: "encryptedAccount",
            type: "bytes32",
          },
          {
            internalType: "address",
            name: "owner",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "createdAt",
            type: "uint256",
          },
        ],
        internalType: "struct ConfidentialStorage.FileView[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "protocolId",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "pure",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "filename",
        type: "string",
      },
      {
        internalType: "bytes",
        name: "encryptedHash",
        type: "bytes",
      },
      {
        internalType: "externalEaddress",
        name: "encryptedAccountHandle",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "encryptedAccountProof",
        type: "bytes",
      },
    ],
    name: "storeFile",
    outputs: [
      {
        internalType: "uint256",
        name: "fileId",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
