#!/usr/bin/env python3

import boto3
from boto3.dynamodb.conditions import Key

REGION = "eu-central-1"
TABLE_NAME = "garden-bot-data"

DEVICE = "cherry-3-pot"
DELETE_BEFORE = 1781868348621

dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(TABLE_NAME)

items_to_delete = []

print("Querying items...")

response = table.query(
    KeyConditionExpression=
        Key("device").eq(DEVICE) &
        Key("timestamp").lt(DELETE_BEFORE)
)

items_to_delete.extend(response["Items"])

while "LastEvaluatedKey" in response:
    response = table.query(
        KeyConditionExpression=
            Key("device").eq(DEVICE) &
            Key("timestamp").lt(DELETE_BEFORE),
        ExclusiveStartKey=response["LastEvaluatedKey"]
    )
    items_to_delete.extend(response["Items"])

count = len(items_to_delete)

print(f"Found {count} items to delete.")
print(f"device = {DEVICE}")
print(f"timestamp < {DELETE_BEFORE}")

if count == 0:
    print("Nothing to delete.")
    exit(0)

confirm = input("Type DELETE to proceed: ")

if confirm != "DELETE":
    print("Aborted.")
    exit(1)

with table.batch_writer() as batch:
    for item in items_to_delete:
        batch.delete_item(
            Key={
                "device": item["device"],
                "timestamp": item["timestamp"],
            }
        )

print(f"Deleted {count} items.")
