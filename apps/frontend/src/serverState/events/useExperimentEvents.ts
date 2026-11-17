import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import eventService from "../../network/services/events/eventService";
import type { EventFeed } from "../../network/services/events/eventSchemas";
import { experimentQueryKeys } from "../experiments/experimentQueryKeys";
import { outputQueryKeys } from "../outputs/outputQueryKeys";
import { isCurrentSession, useServerSession } from "../useServerSession";
import { eventQueryKeys } from "./eventQueryKeys";

export const experimentEventPollInterval = (feed?: EventFeed) =>
  feed?.has_more ? 1 : (feed?.poll_after_seconds ?? 10) * 1000;

export const experimentEventsQueryOptions = (client: QueryClient, userId: string) => queryOptions({
  queryKey: eventQueryKeys.feed(userId),
  queryFn: async ({ signal }) => {
    const previous = client.getQueryData<EventFeed>(eventQueryKeys.feed(userId));
    const feed = await eventService.list({ after: previous?.last_id, scope: "mine" }, signal);
    if (signal.aborted || !isCurrentSession(client, userId)) return feed;
    // A fresh cursor contains no history: reconcile existing views on startup too.
    if (!previous) {
      await Promise.all([
        client.invalidateQueries({ queryKey: experimentQueryKeys.lists(userId) }),
        client.invalidateQueries({ queryKey: experimentQueryKeys.details(userId) }),
        client.invalidateQueries({ queryKey: outputQueryKeys.user(userId) }),
      ]);
    } else {
      const changes = feed.events.filter((event) => event.type.startsWith("experiment."));
      const ids = new Set(changes.map((event) => event.data.experiment_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0));
      await Promise.all([
        ...(changes.length ? [client.invalidateQueries({ queryKey: experimentQueryKeys.lists(userId) })] : []),
        ...Array.from(ids).flatMap((id) => [
          client.invalidateQueries({ queryKey: experimentQueryKeys.detail(userId, id) }),
          client.invalidateQueries({ queryKey: outputQueryKeys.experiment(userId, id) }),
        ]),
      ]);
    }
    return feed;
  },
  // Keep the cursor only while observed. Remounting establishes a fresh cursor
  // and reconciles queries; session cleanup also cancels/removes this feed.
  gcTime: 0, staleTime: Infinity, retry: false,
  refetchOnWindowFocus: "always", refetchOnReconnect: "always",
  refetchInterval: (query) => experimentEventPollInterval(query.state.data),
});

// Mount once in the protected app shell when UI integration is authorized.
// This hook returns feed/polling state; useExperiments supplies the actual list.
export const useExperimentEvents = (enabled = true) => {
  const client = useQueryClient();
  const session = useServerSession();
  return useQuery({ ...experimentEventsQueryOptions(client, session.userId), enabled: session.enabled && enabled });
};
