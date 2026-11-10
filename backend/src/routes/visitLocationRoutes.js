import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { reverseVisitLocation, visitCoordinates } from "../services/visitGeocoder.js";

export function createVisitLocationRoutes({ authenticate = requireAuth, lookup = reverseVisitLocation } = {}) {
  const router = Router();
  router.use(authenticate);
  router.get("/reverse", async (request, response, next) => {
    response.set("Cache-Control", "no-store");
    try {
      const point = visitCoordinates(request.query.lat, request.query.lon);
      response.json(await lookup(point.latitude, point.longitude));
    } catch (error) { next(error); }
  });
  return router;
}

export const visitLocationRoutes = createVisitLocationRoutes();
