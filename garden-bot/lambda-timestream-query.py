import boto3
import json
from boto3.dynamodb.conditions import Key, Attr
from datetime import datetime, timedelta
from decimal import Decimal

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("garden-bot-data")

print('Loading function')

def lambda_handler(event, context):

    query_params = event.get('queryStringParameters') or {}
    daysAgo = query_params.get('daysago')
    if (not daysAgo) or (not daysAgo.isdigit()) or int(daysAgo) > 30 or int(daysAgo) < 1:
        daysAgo = 1

    daysAgo = int(daysAgo)

    now = datetime.utcnow()
    start_timestamp = now - timedelta(days=daysAgo)
    start_timestamp_precise = int(start_timestamp.timestamp()) * 1000

    device_name = query_params.get('device')
    if not device_name:
        device_name = 'cherry-3-pot'

    response = table.query(
        KeyConditionExpression=Key('device').eq(device_name) & Key('timestamp').gt(start_timestamp_precise)
    )

    rows = response['Items']

    battery_points = []
    moisture_points = []
    water_available_points = []
    watered_points = []
    temp_points = []
    for row in rows:
        battery_points.append(rowToObj(row, 'battery'))
        moisture_points.append(rowToObj(row, 'moisture'))
        water_available_points.append(rowToObj(row, 'water_available'))
        watered_points.append(rowToObj(row, 'watered'))
        temp_points.append(rowToObj(row, 'temp'))

    pivoted_rows = {
       "battery": battery_points,
       "moisture": moisture_points,
       "water_available": water_available_points,
       "watered": watered_points,
       "temp": temp_points
    }

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        },
        "body": json.dumps({
            "input": query_params,
            "data": pivoted_rows
            })
    }


def rowToObj(row, measurementName):
    measurement_value = row.get('measurements').get(measurementName, 0)
    timestamp_value = row.get('timestamp')
    device_value = row.get('device')

    return {
        "time": int(timestamp_value),
        "value": int(measurement_value),
        "location": device_value
    }
