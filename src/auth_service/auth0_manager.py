import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional

from auth0.authentication import GetToken
from auth0.management import Auth0


@dataclass
class Configuration:
    client_id: str
    client_secret: str
    domain: str


class AuthTokenRefreshException(Exception):
    pass


default_user_fields = [
    "user_id",
    "name",
    "email",
    "email_verified",
    "picture",
    "given_name",
    "family_name",
]


class Auth0Manager:
    def __init__(self, configuration: Configuration):
        self.configuration = configuration
        self.access_token = None
        self.expires_at = None

    def refresh_token(self):
        """Refreshes the Auth0 access token and stores it in the manager"""
        try:
            response = GetToken(
                domain=self.configuration.domain,
                client_id=self.configuration.client_id,
                client_secret=self.configuration.client_secret,
            ).client_credentials("https://{}/api/v2/".format(self.configuration.domain))
            self.access_token = response["access_token"]
            self.expires_at = datetime.now() + timedelta(seconds=response["expires_in"])
        except Exception as e:
            raise AuthTokenRefreshException(e)

    def get_token(self) -> str:
        """Returns the Auth0 OAuth2 access token, refreshing it if necessary"""
        if self.expires_at is None or datetime.now() > self.expires_at - timedelta(
            minutes=5
        ):
            self.refresh_token()
        return self.access_token

    def get_client(self) -> Auth0:
        return Auth0(self.configuration.domain, self.get_token())

    def get_users(
        self,
        user_ids: List[str] | str,
        fields: Optional[List[str]] = None,
        max_results: Optional[int] = 100,
    ):
        """Gets a list of users from Auth0"""
        if len(user_ids) == 0:
            return []
        elif isinstance(user_ids, str) or len(user_ids) == 1:
            return [
                self.get_client().users.get(
                    user_ids[0],
                    fields=fields if fields is not None else default_user_fields,
                )
            ]
        ids = '" OR "'.join(user_ids)
        query = f'user_id:("{ids}")'

        users: List = []
        per_page = min(max_results, 100)
        page = 0
        while True and len(users) < max_results:
            results = self.get_client().users.list(
                q=query.replace(" ", "\ "),  # escape spaces to improve performance
                fields=fields if fields is not None else default_user_fields,
                page=page,
                per_page=per_page,
                include_totals=True,
            )
            total_results = results["total"]
            users += results["users"]
            if (
                len(results["users"]) < per_page
                or len(users) >= total_results
                or len(users) >= max_results
            ):
                break
            page += 1

        return users

    def update_user(self, user_id: str, data: dict):
        """Updates a user in Auth0"""
        self.get_client().users.update(user_id, data)
