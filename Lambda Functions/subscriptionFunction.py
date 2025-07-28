import json
import boto3
import uuid
from boto3.dynamodb.conditions import Key
from urllib.parse import unquote
from html import unescape

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
subscription_table = dynamodb.Table('user_subscriptions')
music_table = dynamodb.Table('music')
session_table = dynamodb.Table('sessions')
s3 = boto3.client('s3', region_name='us-east-1')
BUCKET_NAME = 'rmit-music-images'

def generate_presigned_url(bucket_name, key, expiration=3600):
    try:
        url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket_name, 'Key': key},
            ExpiresIn=expiration
        )
        return url
    except Exception as e:
        print(f"Error generating pre-signed URL: {e}")
        return None

def lambda_handler(event, context):
    try:
        print("Received event:", json.dumps(event))
        method = event.get('httpMethod')
        headers = event.get('headers', {})
        session_token = headers.get('X-Session-Token') or headers.get('x-session-token')

        if not session_token:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({"error": "Session token missing."})
            }

        session_response = session_table.get_item(Key={'session_token': session_token})
        if 'Item' not in session_response:
            return {
                'statusCode': 401,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({"error": "Invalid session token."})
            }

        user_email = session_response['Item']['email']

        if method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST, DELETE, GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
                },
                'body': 'CORS preflight successful'
            }

        if method == 'GET':
            response = subscription_table.query(
                KeyConditionExpression=Key('user_email').eq(user_email)
            )
            subscriptions = response.get('Items', [])

            for sub in subscriptions:
                if 'img_key' in sub:
                    presigned_url = generate_presigned_url(BUCKET_NAME, sub['img_key'])
                    if presigned_url:
                        sub['img_url'] = presigned_url

            subscriptions.sort(key=lambda x: x.get('title', '').lower())

            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({"subscriptions": subscriptions})
            }

        body = json.loads(event.get('body', '{}'))
        raw_title = body.get('title', '')
        decoded_title = unescape(raw_title)
        year = body.get('year')
        subscription_uuid = body.get('uuid')

        if method == 'POST':
            response = music_table.get_item(Key={'title': decoded_title, 'year': year})
            if 'Item' not in response:
                return {
                    'statusCode': 404,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({"error": "Music not found."})
                }

            music_item = response['Item']
            subscription_uuid = str(uuid.uuid4())

            
            img_key = None
            if 'img_url' in music_item and 'githubusercontent.com' in music_item['img_url']:
                img_name = music_item['img_url'].split("/")[-1]
                img_key = f'images/{img_name}'

            subscription_table.put_item(
                Item={
                    'user_email': user_email,
                    'uuid': subscription_uuid,
                    'title': music_item['title'],
                    'year': music_item['year'],
                    'album': music_item['album'],
                    'artist': music_item['artist'],
                    'img_key': img_key  # Store key only
                }
            )

            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({"success": True, "uuid": subscription_uuid})
            }

        elif method == 'DELETE':
            if not subscription_uuid:
                return {
                    'statusCode': 400,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({"error": "UUID is required for deletion."})
                }

            subscription_table.delete_item(
                Key={
                    'user_email': user_email,
                    'uuid': subscription_uuid
                }
            )

            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({"success": True})
            }

        return {
            'statusCode': 405,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({"error": "Method not allowed."})
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({"error": str(e)})
        }
