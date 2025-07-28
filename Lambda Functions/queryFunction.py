import json
import boto3
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
music_table = dynamodb.Table('music')
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

def query_index(index_name, key_name, key_value):
    response = music_table.query(
        IndexName=index_name,
        KeyConditionExpression=Key(key_name).eq(key_value)
    )
    return response.get('Items', [])

def lambda_handler(event, context):
    try:
        print("FULL EVENT RECEIVED: ", json.dumps(event))
        
        method = event.get('httpMethod')
        headers = event.get('headers', {})
        session_token = headers.get('X-Session-Token') or headers.get('x-session-token')
        
        print("HTTP Method: ", method)
        print("Headers: ", headers)
        print("Session Token: ", session_token)
        
        if not session_token:
            print("Session token is missing.")
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
                },
                'body': json.dumps({"error": "Session token missing."})
            }

        if method == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
                },
                'body': 'CORS preflight successful'
            }

        if method == 'POST':
            body = json.loads(event.get('body', '{}'))

            title = body.get('title', '').strip()
            year = body.get('year', '').strip()
            artist = body.get('artist', '').strip()
            album = body.get('album', '').strip()

            if not (title or year or artist or album):
                print("No query parameters provided. At least one is required.")
                return {
                    'statusCode': 400,
                    'headers': {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': '*',
                        'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
                    },
                    'body': json.dumps({"error": "You must provide at least one filter: title, year, artist, or album."})
                }

            results = []

            if artist and not year and not title and not album:
                print("Querying artist-title-index")
                results = query_index('artist-title-index', 'artist', artist)

            elif album and not year and not title and not artist:
                print("Querying album-title-index")
                results = query_index('album-title-index', 'album', album)

            elif year and not title and not artist and not album:
                print("Querying year-title-index")
                results = query_index('year-title-index', 'year', year)
            
            elif title and not year and not artist and not album:
                print("Querying title-year-index")
                results = query_index('title-year-index', 'title', title)
            
            else:
                print("Using Scan operation for more complex queries")
                filter_conditions = []
                
                if title:
                    filter_conditions.append(Attr('title').contains(title))
                if year:
                    filter_conditions.append(Attr('year').eq(year))
                if artist:
                    filter_conditions.append(Attr('artist').contains(artist))
                if album:
                    filter_conditions.append(Attr('album').contains(album))

                if filter_conditions:
                    combined_filter = filter_conditions[0]
                    for condition in filter_conditions[1:]:
                        combined_filter = combined_filter & condition

                    response = music_table.scan(
                        FilterExpression=combined_filter
                    )
                    results = response.get('Items', [])
                else:
                    response = music_table.scan()
                    results = response.get('Items', [])

            
            for item in results:
                if 'img_url' in item and 'githubusercontent.com' in item['img_url']:
                    img_name = item['img_url'].split("/")[-1]
                    s3_key = f'images/{img_name}'
                    presigned_url = generate_presigned_url(BUCKET_NAME, s3_key)
                    if presigned_url:
                        item['img_url'] = presigned_url
            
            print("Items Retrieved: ", results)

            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
                },
                'body': json.dumps({"success": True, "results": results})
            }

        return {
            'statusCode': 405,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
            },
            'body': json.dumps({"error": "Method not allowed."})
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': '*',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Token'
            },
            'body': json.dumps({"error": str(e)})
        }
