import json
import boto3
import time
from decimal import Decimal

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
session_table = dynamodb.Table('sessions')
login_table = dynamodb.Table('login')

def decimal_to_float(obj):
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, dict):
        return {k: decimal_to_float(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [decimal_to_float(v) for v in obj]
    return obj

def lambda_handler(event, context):
    try:
        print("FULL EVENT RECEIVED: ", json.dumps(event))

        if 'headers' not in event or not isinstance(event['headers'], dict):
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
                },
                'body': json.dumps({'error': 'Headers are missing from the request.'})
            }

        session_token = event['headers'].get('x-session-token') or event['headers'].get('X-Session-Token')
        print(f"Received session token: {session_token}")

        if not session_token:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
                },
                'body': json.dumps({'error': 'Session token is missing.'})
            }

        response = session_table.get_item(Key={'session_token': session_token})
        response = decimal_to_float(response) 
        
        print("DynamoDB Response: ", json.dumps(response))

        if 'Item' in response:
            if int(time.time()) < response['Item']['ttl']:
                email = response['Item']['email']
                
                user_response = login_table.get_item(Key={'email': email})
                user_response = decimal_to_float(user_response)  
                
                if 'Item' in user_response:
                    user_name = user_response['Item'].get('user_name', email)

                    return {
                        'statusCode': 200,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': '*',
                            'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
                        },
                        'body': json.dumps({'success': True, 'user_name': user_name})
                    }
                else:
                    return {
                        'statusCode': 404,
                        'headers': {
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': '*',
                            'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
                        },
                        'body': json.dumps({'success': False, 'message': 'User not found'})
                    }

        return {
            'statusCode': 401,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
            },
            'body': json.dumps({'success': False, 'message': 'Invalid session token'})
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
            },
            'body': json.dumps({"error": str(e)})
        }
