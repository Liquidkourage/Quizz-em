# Keep the server's settings across restarts (Railway volume)

## Why

Railway wipes a service's files every time it restarts or redeploys. The server keeps a few small settings files on disk, and without a volume they reset:

- the show clock and the count of hands played (so blind levels and shuffle timing start over),
- the blind settings, answer countdown and shuffle settings the host chose,
- the question library, when `DATABASE_URL` is not set.

Tables, seats and chips are saved to Postgres and are not affected. A **volume** is a permanent disk Railway attaches to the service. Files in it survive restarts and deploys.

## Set it up (about 5 minutes, do it before the event, not during)

1. Open the project on railway.com and click the **server** service.
2. Add a volume. Either right-click the service card on the project canvas and choose **Attach Volume**, or press `Cmd+K` (`Ctrl+K` on Windows) and search for "volume". The exact wording may differ; the Railway docs page "Volumes" has current screenshots.
3. Set the **mount path** to `/data`.
4. Open the service's **Variables** tab and add `QHE_DATA_DIR` with the value `/data` (the same path as the mount).
5. Let the service redeploy. Attaching a volume or changing a variable triggers one.
6. Check the deploy log: it should start normally and show no errors about permissions or missing folders.

## Check it worked

1. Open the host screen and change a setting you can see, for example the answer countdown.
2. In Railway, restart the service.
3. When the host screen reconnects, the setting should still be what you chose. If it went back to the default, `QHE_DATA_DIR` or the mount path is wrong (they must match).

## Notes

- One volume holds the files for one service. It is not shared between environments.
- Deleting the volume deletes the settings files. That is fine between events.
- To start a clean event, use the host's **New game** control. It resets the show clock and hand count; the volume itself needs no cleaning.
