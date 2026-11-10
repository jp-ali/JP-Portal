# Visit photo locations

Online marketer and trainer visits check a fresh device location before drawing a camera photo, including when location was previously allowed at camera startup. The fix must have an accuracy of 150 metres or better. Denied, disabled, stale, or approximate fixes cannot produce a saved photo. Native phone-camera uploads are checked before accepting and stamping the returned image.

Online address lookup uses the authenticated `/api/visit-location/reverse` endpoint on the portal's own origin. This avoids depending on third-party browser CORS headers. The photo follows the supplied reference: calendar/clock/pin icons, weekday and DD/MM/YYYY, 12-hour Pakistan time, and a complete House/Street/Block/city/district/province/country address on a black band. Only fields actually returned by the map are shown; house numbers and place names are never invented. An unavailable address is reported for retry. Offline visits use the same headers but still require and show fresh GPS, since a readable address cannot be retrieved without a connection.

The user explicitly approved sending coordinates to the existing OpenStreetMap/Nominatim service. Account names, photos, and school records are not sent to it. The server keeps a bounded in-memory address cache for 24 hours, combines concurrent requests for the same coordinates, and spaces provider requests at least 1.1 seconds apart across the app. A bounded queue returns a retry message during bursts.

Provider: https://nominatim.openstreetmap.org/reverse. Set `VISIT_GEOCODER_URL` in `portal.env` to switch to a compatible hosted or self-hosted provider. Production secrets and database settings do not change for this release. Attribution is printed on the online visit photo.

The public service is for moderate interactive use, has a maximum of one request per second per application, and may restrict access. It is not an unlimited geocoding service for a national rollout. Use a suitable hosted or self-hosted instance before sustained traffic exceeds this capacity. Policy: https://operations.osmfoundation.org/policies/nominatim/ . API: https://nominatim.org/release-docs/latest/api/Reverse/ .
