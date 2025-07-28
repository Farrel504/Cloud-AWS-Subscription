import json
import boto3
import uuid
import time

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
login_table = dynamodb.Table('login')  
session_table = dynamodb.Table('sessions')  

def lambda_handler(event, context):
    try:
        
        print("Received eventRAGGGGGGGGGGHhh: " + json.dumps(event))
        
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps('CORS preflight successful')
            }
        
       
        body = json.loads(event['body'])
        email = body.get('email')
        password = body.get('password')

        print(f"Received Email: {email}")
        print(f"Received Password: {password}")

        response = login_table.get_item(Key={'email': email})
        
        print("DynamoDB Response: ", json.dumps(response))

        if 'Item' in response and response['Item'].get('password') == password:
           
            session_token = str(uuid.uuid4())
            ttl = int(time.time()) + 3600  # Expire session after 1 hour (3600 seconds)
            
            
            session_table.put_item(
                Item={
                    'session_token': session_token,
                    'email': email,
                    'created_at': int(time.time()),
                    'ttl': ttl
                }
            )
            
            print(f"Session {email} with token {session_token}")

            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps({
                    "success": True,
                    "session_token": session_token,
                    "session_expiration": ttl  
                })
            }
        else:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                'body': json.dumps({"success": False, "message": "Email or password is invalid"})
            }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': json.dumps({"error": str(e)})
        }
