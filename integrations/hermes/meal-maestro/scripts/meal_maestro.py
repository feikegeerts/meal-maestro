#!/usr/bin/env python3
"""Small, dependency-free client. Credentials never appear in CLI arguments."""

import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import uuid


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # Never forward an Authorization header to a redirect destination.
        return None


def recipe_id(value):
    try:
        return str(uuid.UUID(value))
    except ValueError:
        raise argparse.ArgumentTypeError("Recipe ID must be a UUID") from None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    listing = commands.add_parser("list")
    listing.add_argument("--query")
    listing.add_argument("--category")
    listing.add_argument("--eaten-status", choices=["all", "recorded", "unrecorded"])
    listing.add_argument("--last-eaten-before")
    listing.add_argument("--sort", choices=["last_eaten_asc", "last_eaten_desc", "title", "newest"])
    listing.add_argument("--limit", type=int)
    listing.add_argument("--offset", type=int)
    commands.add_parser("get").add_argument("id", type=recipe_id)
    eaten = commands.add_parser("mark-eaten")
    eaten.add_argument("id", type=recipe_id)
    eaten.add_argument("--date")
    args = parser.parse_args()

    origin = os.environ.get("MEAL_MAESTRO_URL", "").rstrip("/")
    token = os.environ.get("MEAL_MAESTRO_API_TOKEN", "")
    parsed = urllib.parse.urlsplit(origin)
    local_http = parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1", "::1")
    if (not parsed.hostname or (parsed.scheme != "https" and not local_http)
            or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment):
        parser.exit(2, "Set MEAL_MAESTRO_URL to an HTTPS origin (HTTP only for localhost).\n")
    if not re.fullmatch(r"[A-Za-z0-9_-]{43,256}", token):
        parser.exit(2, "Set MEAL_MAESTRO_API_TOKEN locally in your Hermes profile environment.\n")

    path = "/api/agent/v1/recipes"
    body = None
    method = "GET"
    if args.command == "list":
        values = {key: value for key, value in vars(args).items()
                  if key != "command" and value is not None}
        path += "?" + urllib.parse.urlencode(values)
    else:
        path += "/" + args.id
        if args.command == "mark-eaten":
            path += "/eaten"
            method = "PUT"
            body = json.dumps({"date": args.date} if args.date else {}).encode("utf-8")

    request = urllib.request.Request(origin + path, data=body, method=method, headers={
        "Authorization": "Bearer " + token,
        "Accept": "application/json",
        "Content-Type": "application/json",
    })
    try:
        with urllib.request.build_opener(NoRedirect()).open(request, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        # Print only status, not headers, URLs, credentials or untrusted HTML.
        parser.exit(1, "Meal Maestro API returned HTTP %s; no success confirmed.\n" % error.code)
    except (urllib.error.URLError, TimeoutError, ValueError):
        parser.exit(1, "Meal Maestro request failed; no success confirmed.\n")
    json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
