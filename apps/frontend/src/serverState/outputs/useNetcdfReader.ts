import type { NetcdfCaseReader } from "../../features/ScenarioOutputModal/netcdf/readerConfiguration";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import outputService from "../../network/services/outputs/outputService";
import { NetcdfReader, type DownloadProgress } from "../../network/services/outputs/netcdfReader";
import { requireCurrentSession, useServerSession } from "../useServerSession";
import type { FileMetadata, OutputSource, ReaderResult } from "../../features/ScenarioOutputModal/netcdf/types";

export function useNetcdfReader(readerProfile: NetcdfCaseReader, source?: OutputSource) {
  const client = useQueryClient();
  const { userId } = useServerSession();
  const reader = useRef<NetcdfReader | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<DownloadProgress>({ received: 0, total: null, message: "Preparing remote output…" });
  const [attempt, setAttempt] = useState(0);
  const id = source?.id;
  const sampleUrl = source?.sampleUrl;
  const scenarioName = source?.scenarioName;
  useEffect(() => {
    if (!id) return;
    let active = true;
    const instance = new NetcdfReader(value => { if (active) setProgress(value); }, readerProfile.createWorker);
    reader.current = instance;
    const load = async () => {
      try {
        if (scenarioName !== readerProfile.scenarioName) throw new Error("This reader does not support the selected case study.");
        let url = sampleUrl;
        let credentials: RequestCredentials = "omit";
        if (!url) {
          requireCurrentSession(client, userId);
          const download = await outputService.downloadUrl(id);
          requireCurrentSession(client, userId);
          if (!active) return;
          url = new URL(download.url, window.location.origin).href;
          if (!download.presigned && new URL(url).origin === window.location.origin) credentials = "same-origin";
        }
        if (!active) return;
        const resolved = new URL(url, window.location.origin);
        if (!["http:", "https:"].includes(resolved.protocol)) throw new Error("Unsupported download URL.");
        const result = await instance.request<FileMetadata>("open", {
          url: resolved.href,
          credentials,
          vendor: new URL(`${import.meta.env.BASE_URL}netcdf-lab/vendor`, window.location.origin).href,
        });
        if (active) setMetadata(result);
      } catch (failure) { if (active) setError(failure instanceof Error ? failure.message : "Could not read the output file."); }
    };
    void load();
    return () => { active = false; instance.close(); if (reader.current === instance) reader.current = null; };
  }, [id, sampleUrl, scenarioName, readerProfile, userId, client, attempt]);
  const request = useCallback(<T extends ReaderResult>(action: string, params: Record<string, unknown>) => {
    if (!reader.current) return Promise.reject(new Error("The output reader is not open."));
    return reader.current.request<T>(action, params);
  }, []);
  const retry = () => { setError(null); setMetadata(null); setProgress({ received: 0, total: null, message: "Preparing remote output…" }); setAttempt(value => value + 1); };
  return { metadata, error, progress, request, retry };
}
