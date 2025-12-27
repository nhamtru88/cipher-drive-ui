'use client';

import { useQuery } from "@tanstack/react-query";

let sdkInitialized = false;

function waitForSDK(maxWait = 10000): Promise<typeof window.relayerSDK> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("window is not defined"));
      return;
    }

    if (window.relayerSDK && typeof window.relayerSDK.initSDK === "function") {
      resolve(window.relayerSDK);
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (window.relayerSDK && typeof window.relayerSDK.initSDK === "function") {
        clearInterval(checkInterval);
        resolve(window.relayerSDK);
      } else if (Date.now() - startTime > maxWait) {
        clearInterval(checkInterval);
        reject(new Error("Relayer SDK failed to load within timeout"));
      }
    }, 100);
  });
}

export function useZamaInstance() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["zamaRelayerInstance"],
    queryFn: async () => {
      console.debug("🔍 [ZamaRelayer] Starting initialization...");

      if (typeof window === "undefined") {
        return null;
      }

      const sdk = await waitForSDK();
      
      console.debug("🔍 [ZamaRelayer] SDK loaded, extracting functions...");
      console.debug("🔍 [ZamaRelayer] window.relayerSDK keys (before init):", Object.keys(sdk || {}));

      const { initSDK, createInstance } = sdk;
      console.debug("🔍 [ZamaRelayer] SDK functions extracted:", {
        hasInitSDK: typeof initSDK === "function",
        hasCreateInstance: typeof createInstance === "function",
        sdkInitialized,
      });

      if (typeof initSDK !== "function") {
        console.error("❌ [ZamaRelayer] initSDK is not a function");
        throw new Error("initSDK is not available on window.relayerSDK");
      }

      if (typeof createInstance !== "function") {
        console.error("❌ [ZamaRelayer] createInstance is not a function");
        throw new Error("createInstance is not available on window.relayerSDK");
      }

      if (!sdkInitialized) {
        console.debug("🔍 [ZamaRelayer] Calling initSDK()...");
        const startTime = Date.now();
        try {
          const initResult = await initSDK();
          const duration = Date.now() - startTime;
          console.debug(`✅ [ZamaRelayer] initSDK() completed in ${duration}ms, result:`, initResult);
        } catch (initError) {
          const duration = Date.now() - startTime;
          console.error(`❌ [ZamaRelayer] initSDK() failed after ${duration}ms:`, initError);
          throw initError;
        }
        sdkInitialized = true;
        console.debug("🚀 [ZamaRelayer] SDK initialized successfully");
      } else {
        console.debug("🔍 [ZamaRelayer] SDK already initialized, skipping initSDK()");
      }

      console.debug("🔍 [ZamaRelayer] window.relayerSDK keys (after init):", Object.keys(sdk || {}));

      const config = sdk.ZamaEthereumConfig || sdk.SepoliaConfig;

      console.log("🔍 [ZamaRelayer] Config:", config);
      if (!config) {
        console.error("❌ [ZamaRelayer] Neither ZamaEthereumConfig nor SepoliaConfig is available after initSDK()");
        console.error("❌ [ZamaRelayer] Available properties on window.relayerSDK:", Object.keys(sdk));
        console.error("❌ [ZamaRelayer] Full window.relayerSDK object:", sdk);
        throw new Error(
          "Config (ZamaEthereumConfig or SepoliaConfig) is not available on window.relayerSDK after initialization"
        );
      }

      if (typeof config !== "object") {
        console.error("❌ [ZamaRelayer] Config is not an object:", typeof config);
        throw new Error(`Config is not an object, got: ${typeof config}`);
      }

      if (!("verifyingContractAddressDecryption" in config)) {
        console.error("❌ [ZamaRelayer] Config missing 'verifyingContractAddressDecryption' property");
        console.error("❌ [ZamaRelayer] Config structure:", JSON.stringify(config, null, 2));
        throw new Error("Config is missing required property: verifyingContractAddressDecryption");
      }

      console.debug("🔍 [ZamaRelayer] Calling createInstance()...");
      console.debug("🔍 [ZamaRelayer] Config being passed:", {
        type: typeof config,
        keys: Object.keys(config),
        hasVerifyingContract: "verifyingContractAddressDecryption" in config,
        config: config,
      });
      const startTime = Date.now();
      try {
        const instance = await createInstance(config);
        const duration = Date.now() - startTime;
        console.debug(`✅ [ZamaRelayer] createInstance() completed in ${duration}ms`);
        console.debug("🔍 [ZamaRelayer] Instance created:", {
          hasInstance: !!instance,
          instanceType: typeof instance,
        });
        return instance;
      } catch (createError) {
        const duration = Date.now() - startTime;
        console.error(`❌ [ZamaRelayer] createInstance() failed after ${duration}ms:`, createError);
        throw createError;
      }
    },
    enabled: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: (failureCount: number) => {
      console.debug(
        `🔍 [ZamaRelayer] Retry attempt ${failureCount}, window.relayerSDK exists:`,
        typeof window !== "undefined" && !!window.relayerSDK
      );
      if (typeof window !== "undefined" && !window.relayerSDK && failureCount < 10) {
        console.error("❌ [ZamaRelayer] Relayer SDK not found on window object.");
        return true; // Retry to wait for SDK to load
      }
      return false;
    },
    retryDelay: 1_000,
    staleTime: 60 * 60_000,
  });

  return {
    instance: data || null,
    isLoading,
    error: isError ? (error instanceof Error ? error.message : "Failed to initialize Zama instance") : null,
  };
}
