import logging
from typing import Any, Dict, List

import requests

from .models import LocalConfig, LocalLicense, SyncOutbox

logger = logging.getLogger('mallor.sync')

_INGEST_PATH = '/api/offline/sync/ingest/'
_TIMEOUT = 15


class CloudSyncError(Exception):
    pass


class CloudSyncAdapter:
    """
    Pushes SyncOutbox events from a local Mallor instance to its paired cloud.
    Authenticates using the LocalLicense key (SyncToken scheme).
    """

    def __init__(self, config: LocalConfig):
        if not config.cloud_api_url:
            raise CloudSyncError('cloud_api_url is not configured for this empresa')

        license_obj = (
            LocalLicense.objects.filter(
                empresa=config.empresa,
                status__in=[LocalLicense.Status.ACTIVE, LocalLicense.Status.GRACE],
            )
            .only('license_key')
            .first()
        )
        if license_obj is None:
            raise CloudSyncError(
                f'No active license found for empresa {config.empresa_id}'
            )

        self._url = config.cloud_api_url.rstrip('/') + _INGEST_PATH
        self._token = license_obj.license_key

    # ------------------------------------------------------------------ #

    def push_events(self, events: List[SyncOutbox]) -> Dict[str, Any]:
        body = {
            'events': [
                {
                    'uuid': str(e.uuid),
                    'idempotency_key': e.idempotency_key,
                    'aggregate_type': e.aggregate_type,
                    'aggregate_uuid': str(e.aggregate_uuid),
                    'event_type': e.event_type,
                    'payload': e.payload,
                }
                for e in events
            ]
        }
        try:
            resp = requests.post(
                self._url,
                json=body,
                headers={
                    'Authorization': f'SyncToken {self._token}',
                    'Content-Type': 'application/json',
                },
                timeout=_TIMEOUT,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.Timeout as exc:
            raise CloudSyncError(f'Timeout after {_TIMEOUT}s') from exc
        except requests.HTTPError as exc:
            snippet = ''
            try:
                snippet = exc.response.text[:300]
            except Exception:
                pass
            raise CloudSyncError(
                f'HTTP {exc.response.status_code}: {snippet}'
            ) from exc
        except requests.RequestException as exc:
            raise CloudSyncError(str(exc)) from exc
