import { useMutation, useQueryClient } from "@tanstack/react-query";
import outputService from "../../network/services/outputs/outputService";
import type { OutputFile } from "../../network/services/outputs/outputSchemas";
import { requireCurrentSession, useServerSession } from "../useServerSession";

// A mutation gives an explicit on-demand action, although the endpoint is GET.
// Do not persist or automatically prefetch audited, expiring signed URLs.
export const useOutputDownloadUrl = (id: string) => {
  const client = useQueryClient();
  const { userId } = useServerSession();
  return useMutation({
    mutationKey: ["outputs", userId, id, "download"], retry: false, gcTime: 0,
    mutationFn: async (file: OutputFile = "nc") => {
      requireCurrentSession(client, userId);
      const download = await outputService.downloadUrl(id, file);
      requireCurrentSession(client, userId);
      return download;
    },
  });
};
