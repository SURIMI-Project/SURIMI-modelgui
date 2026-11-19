import request from "../../request";
import { validateRequest } from "../validateRequest";
import { eventFeedSchema, eventFiltersSchema, type EventFilters } from "./eventSchemas";

const eventService = {
  list: (filters: EventFilters = {}, signal?: AbortSignal) => request({
    path: "/events", method: "GET", params: validateRequest(eventFiltersSchema, filters),
    responseSchema: eventFeedSchema, signal,
  }),
};
export default eventService;
