import boto3
import json
from boto3.dynamodb.conditions import Key, Attr
from datetime import datetime, timedelta

dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table("garden-bot-data")

print('Loading function')

def lambda_handler(event, context):
    
    # Calculate the timestamp for 24 hours ago
    now = datetime.utcnow()
    twenty_four_hours_ago = now - timedelta(hours=24)
    timestamp_24_hours_ago = int(twenty_four_hours_ago.timestamp()) * 1000
    print("timestamp_24_hours_ago: " + str(timestamp_24_hours_ago))
        
    # Query the table
    response = table.query(
        KeyConditionExpression=Key('device').eq('garden_bot1') & Key('timestamp').gt(timestamp_24_hours_ago)
    )

    rows = response['Items']
    print("rows: " + str(len(rows)))

    battery_points = []
    moisture_1_points = []
    moisture_2_points = []
    watered_points = []
    for row in rows:
        battery_points.append(rowToObj(row, 'battery'))
        moisture_1_points.append(rowToObj(row, 'moisture_1'))
        moisture_2_points.append(rowToObj(row, 'moisture_2'))
        watered_points.append(rowToObj(row, 'watered'))

    pivoted_rows = {
       "battery": battery_points,
       "moisture_1": moisture_1_points,
       "moisture_2": moisture_2_points,
       "watered": watered_points
    }

    return {
        "code": "200",
        "data": pivoted_rows
    }


def rowToObj(row, measurementName):
    return {
        "time": row.get('timestamp'),
        "value": row.get('measurements').get(measurementName),
        "location": row.get('device')
    }