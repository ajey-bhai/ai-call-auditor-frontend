import { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';

const API_BASE_URL = 'https://ai-call-auditor-production.up.railway.app';

function UploadPage() {
  const [audioFile, setAudioFile] = useState(null);
  const [pitchFile, setPitchFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!audioFile || !pitchFile) {
      setError('Please upload both audio and pitch files.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('pitch', pitchFile);
    try {
      const res = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      navigate(`/review/${data.conversation_id || 'demo123'}`);
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Upload Audio & Pitch</h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block font-semibold mb-1">Audio File</label>
          <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files[0])} className="block w-full" />
        </div>
        <div>
          <label className="block font-semibold mb-1">Pitch Document (PDF, DOCX, etc.)</label>
          <input type="file" accept=".pdf,.doc,.docx,.txt" onChange={e => setPitchFile(e.target.files[0])} className="block w-full" />
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button type="submit" className="bg-blue-700 text-white px-4 py-2 rounded font-semibold hover:bg-blue-800" disabled={loading}>
          {loading ? 'Uploading...' : 'Upload & Analyze'}
        </button>
      </form>
    </div>
  );
}

function ReviewPage() {
  const { conversationId } = useParams();
  const [transcript, setTranscript] = useState([]);
  const [audioUrl, setAudioUrl] = useState('');
  const [pitch, setPitch] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Chat state
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Audio ref for timestamp jump
  const audioRef = useRef(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        // Fetch transcript
        const tRes = await fetch(`${API_BASE_URL}/transcript/${conversationId}`);
        const tData = await tRes.json();
        setTranscript(tData.transcript || []);
        setAudioUrl(tData.audio_url || '');
        // Fetch pitch
        const pRes = await fetch(`${API_BASE_URL}/pitch/${conversationId}`);
        const pData = await pRes.json();
        setPitch(pData.pitch || []);
        // Fetch suggestions
        const sRes = await fetch(`${API_BASE_URL}/suggestions/${conversationId}`);
        const sData = await sRes.json();
        setSuggestions(sData.suggestions || []);
      } catch (err) {
        setError('Failed to load review data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [conversationId]);

  // Chat submit handler
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatLoading(true);
    setChatHistory((h) => [...h, { role: 'user', content: chatInput }]);
    try {
      const res = await fetch(`${API_BASE_URL}/chat/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: chatInput }),
      });
      const data = await res.json();
      setChatHistory((h) => [...h, { role: 'assistant', content: data.response || 'No response.' }]);
    } catch {
      setChatHistory((h) => [...h, { role: 'assistant', content: 'Error getting response.' }]);
    } finally {
      setChatInput('');
      setChatLoading(false);
    }
  };

  // Search submit handler
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    setSearchLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/search/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchInput }),
      });
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Jump audio to timestamp
  const jumpToTimestamp = (seconds) => {
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      audioRef.current.play();
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">Review & Coach</h2>
      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {!loading && !error && (
        <>
          {/* Audio Player */}
          {audioUrl && (
            <div className="mb-4">
              <audio controls src={audioUrl} className="w-full" ref={audioRef} />
            </div>
          )}
          {/* Transcript */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Transcript</h3>
            <div className="bg-gray-100 p-3 rounded text-sm max-h-48 overflow-y-auto">
              {transcript.length > 0 ? transcript.map((line, i) => (
                <div key={i}>{line.text}</div>
              )) : <div className="text-gray-400">No transcript available.</div>}
            </div>
          </div>
          {/* Pitch Steps */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Pitch Steps</h3>
            <ul className="list-disc pl-6">
              {pitch.length > 0 ? pitch.map((step, i) => (
                <li key={i}>{step}</li>
              )) : <li className="text-gray-400">No pitch steps available.</li>}
            </ul>
          </div>
          {/* Suggestions */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Suggestions</h3>
            <ul className="list-disc pl-6">
              {suggestions.length > 0 ? suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              )) : <li className="text-gray-400">No suggestions available.</li>}
            </ul>
          </div>
          {/* Chat */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Chat with AI Coach</h3>
            <div className="bg-gray-100 p-3 rounded max-h-40 overflow-y-auto mb-2 text-sm">
              {chatHistory.length === 0 && <div className="text-gray-400">Ask anything about this call...</div>}
              {chatHistory.map((msg, i) => (
                <div key={i} className={msg.role === 'user' ? 'text-blue-700' : 'text-green-700'}>
                  <span className="font-semibold">{msg.role === 'user' ? 'You' : 'Coach'}:</span> {msg.content}
                </div>
              ))}
            </div>
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <input
                className="flex-1 border rounded px-2 py-1"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Ask a question..."
                disabled={chatLoading}
              />
              <button type="submit" className="bg-blue-700 text-white px-3 py-1 rounded" disabled={chatLoading}>
                {chatLoading ? '...' : 'Send'}
              </button>
            </form>
          </div>
          {/* Search */}
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Search Transcript</h3>
            <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-2">
              <input
                className="flex-1 border rounded px-2 py-1"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search for keywords..."
                disabled={searchLoading}
              />
              <button type="submit" className="bg-blue-700 text-white px-3 py-1 rounded" disabled={searchLoading}>
                {searchLoading ? '...' : 'Search'}
              </button>
            </form>
            <div className="bg-gray-100 p-3 rounded text-sm max-h-32 overflow-y-auto">
              {searchResults.length === 0 && <div className="text-gray-400">No results yet.</div>}
              {searchResults.map((result, i) => (
                <div key={i} className="mb-1">
                  <button
                    className="text-blue-700 underline mr-2"
                    onClick={() => jumpToTimestamp(result.timestamp)}
                  >
                    [{result.timestamp}s]
                  </button>
                  {result.text}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-blue-700 text-white px-6 py-4 flex gap-4">
        <Link to="/" className="font-bold text-xl">Sales Coach AI</Link>
        <Link to="/" className="hover:underline">Upload</Link>
        <Link to="/review/demo123" className="hover:underline">Review (Demo)</Link>
      </nav>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/review/:conversationId" element={<ReviewPage />} />
      </Routes>
    </div>
  );
}

export default App;
