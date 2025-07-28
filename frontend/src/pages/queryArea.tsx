import React, { useState } from 'react';
import axios from 'axios';
 

interface Music {
    title: string;
    artist: string;
    year: string;
    album: string;
    img_url?: string;
}

interface Props {
    userName: string;
    onSubscriptionUpdate: () => void; 
}

const QueryArea: React.FC<Props> = ({ userName, onSubscriptionUpdate }) => {
   
    const [title, setTitle] = useState('');
    const [year, setYear] = useState('');
    const [artist, setArtist] = useState('');
    const [album, setAlbum] = useState('');
    const [results, setResults] = useState<Music[]>([]);
    const [error, setError] = useState('');

    const handleQuery = async () => {
        if (!title && !year && !artist && !album) {
            setError('Please fill in at least one field.');
            return;
        }
        setError('');

        const storedSessionToken = localStorage.getItem('session_token');

        if (!storedSessionToken) {
            setError('Session token is missing. Please log in again.');
            return;
        }

        try {
            const response = await axios.post(
                'https://zq2rr53pm4.execute-api.us-east-1.amazonaws.com/test/queryFunction',
                { title, year, artist, album },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Session-Token': storedSessionToken
                    }
                }
            );

            console.log('Response received from queryFunction1:', response);

            let responseData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

            if (responseData.body && typeof responseData.body === 'string') {
                responseData = JSON.parse(responseData.body);
            }

            console.log('Parsed Response Data:', responseData);

            if (responseData.success && responseData.results.length > 0) {
                setResults(responseData.results);
            } else {
                setResults([]);
                setError('No result is retrieved. Please query again.');
            }
        } catch (error) {
            console.error('Error during query:', error);
            setError('Failed to retrieve results. Please try again.');
        }
    };

    // https://stackoverflow.com/questions/68211501/api-call-with-axios-fails-if-special-characters-are-present-in-the-api-output
    const encodeHTML = (str: string) => str
        .replace(/&/g, "&amp;")
        .replace(/'/g, "&#39;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\(/g, "&#40;")
        .replace(/\)/g, "&#41;");

    const handleSubscribe = async (music: Music) => {
        const storedSessionToken = localStorage.getItem('session_token');
    
        if (!storedSessionToken) {
            setError('Session token is missing. Please log in again.');
            return;
        }
    
        try {
           
            const subscriptionResponse = await axios.get(
                'https://eqbqzqdxh1.execute-api.us-east-1.amazonaws.com/test/subscriptionFunction', 
                { 
                    headers: { 
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'X-Session-Token': storedSessionToken  
                    }
                }
            );
    
            let responseData = typeof subscriptionResponse.data === 'string' ? JSON.parse(subscriptionResponse.data) : subscriptionResponse.data;
    
            if (responseData.body && typeof responseData.body === 'string') {
                responseData = JSON.parse(responseData.body);
            }
    
            const currentSubscriptions = responseData.subscriptions || [];
            
            const isAlreadySubscribed = currentSubscriptions.some((sub: Music) => sub.title === music.title && sub.year === music.year);
    
            if (isAlreadySubscribed) {
                console.warn(`Already Subscribed ${music.title} (${music.year})`);
                alert(`You have already subscribed to ${music.title} (${music.year})`);
                return;
            }
            
            const encodedTitle = encodeHTML(music.title);

            const requestData = JSON.stringify({
                title: encodedTitle,
                year: music.year
            });
        
            const response = await fetch('https://eqbqzqdxh1.execute-api.us-east-1.amazonaws.com/test/subscriptionFunction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Session-Token': storedSessionToken
                },
                mode: 'cors',
                body: requestData
            });
    
            if (response.ok) {
                const result = await response.json();
                alert(`Successfully subscribed to ${music.title} (${music.year})`);
                onSubscriptionUpdate();
            } else {
                console.error(' Failed to subscribe. Got not 200', await response.text());
                setError('Failed to subscribe. Please try again.');
            }
        } catch (error: any) {
            console.error('Error subscribing to music:', error.message || error);
            setError('Failed to subscribe. Please try again.');
        }
    };
    
    return (
        <div className="w-full max-w-4xl mx-auto p-4 border rounded shadow-lg bg-white">
            <h3 className="text-2xl mb-4">Query Area</h3>

            <div className="mb-4 grid grid-cols-2 gap-4">
                <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2 border rounded"/>
                <input type="text" placeholder="Year" value={year} onChange={(e) => setYear(e.target.value)} className="w-full p-2 border rounded"/>
                <input type="text" placeholder="Artist" value={artist} onChange={(e) => setArtist(e.target.value)} className="w-full p-2 border rounded"/>
                <input type="text" placeholder="Album" value={album} onChange={(e) => setAlbum(e.target.value)} className="w-full p-2 border rounded"/>
                <button onClick={handleQuery} className="col-span-2 w-full p-2 bg-blue-500 text-white rounded">Query</button>
            </div>

            {error && <div className="text-red-500 mb-4">{error}</div>}

            {results.length > 0 && (
                <div className="overflow-y-auto max-h-[500px] border-t mt-4 pt-4">
                    <h4 className="text-lg mb-2">Results:</h4>
                    <ul>
                        {results.map((music, index) => (
                            <li key={index} className="mb-4 flex items-center bg-gray-100 p-3 rounded-lg shadow-md">
                                {music.img_url && <img src={music.img_url} alt={music.artist} className="w-20 h-20 rounded-lg mr-4" />}
                                <div className="flex-grow">
                                    <p><strong>Title:</strong> {music.title}</p>
                                    <p><strong>Artist:</strong> {music.artist}</p>
                                    <p><strong>Year:</strong> {music.year}</p>
                                    <p><strong>Album:</strong> {music.album}</p>
                                </div>
                                <button onClick={() => handleSubscribe(music)} className="bg-green-500 text-white px-3 py-1 rounded">Subscribe</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default QueryArea;
