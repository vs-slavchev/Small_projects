import boto3
import json

client = boto3.client('timestream-query')

print('Loading function')

def lambda_handler(event, context):
    response = client.query(
        QueryString='SELECT time, measure_name, measure_value::bigint, location from "balcony-esp32-db".measurements WHERE time >= ago(24h) ORDER BY time ASC LIMIT 150',
        MaxRows=200
    )

    rows = response['Rows']
    rows = list(map(lambda row: row['Data'], rows)) # a list of lists
    print("rows: " + str(len(rows)))

    is_battery = lambda x: x[1].get('ScalarValue') == 'battery'
    is_moisture_1 = lambda x: x[1].get('ScalarValue') == 'moisture_1'
    is_moisture_2 = lambda x: x[1].get('ScalarValue') == 'moisture_2'

    # Group elements based on predicates
    grouped_lists = {
        "battery": [rowToObj(x) for x in rows if is_battery(x)],
        "moisture_1": [rowToObj(x) for x in rows if is_moisture_1(x)],
        "moisture_2": [rowToObj(x) for x in rows if is_moisture_2(x)]
    }

    #return json.dumps(response)
    return {
        "code": "200",
        "data": grouped_lists
    }

def rowToObj(row):
    return {
        "time": row[0].get('ScalarValue'),
        "value": row[2].get('ScalarValue'),
        "location": row[3].get('ScalarValue')
    }
