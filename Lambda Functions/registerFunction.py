import json
import boto3

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('login')  

def lambda_handler(event, context):
    try:
        print("Received event: " + json.dumps(event))

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

        # Normalize email input (trim + lowercase)
        raw_email = body.get('email', '')
        email = raw_email.strip().lower()

        user_name = body.get('user_name')
        password = body.get('password')

        if not email or not user_name or not password:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({"success": False, "message": "Missing email, username or password"})
            }

        
        response = table.get_item(Key={'email': email})

        if 'Item' in response:
            return {
                'statusCode': 409,  # Conflict
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({"success": False, "message": "The email already exists"})
            }

        # If email doesn't exist, add new user
        table.put_item(Item={
            'email': email,
            'user_name': user_name,
            'password': password
        })

        return {
            'statusCode': 201,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({"success": True, "message": "User registered successfully"})
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
