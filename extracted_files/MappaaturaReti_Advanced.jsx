/**
 * MappaaturaReti - Versione Avanzata con API Support
 * 
 * Questa versione supporta:
 * - Caricamento dati da API
 * - Salvataggio dati su database
 * - Selezione multiple
 * - Filtri avanzati
 * - Export/Import
 * - Undo/Redo
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import mapDataStatic from './mappatura_reti_data.json';

const MappaaturaRetiAdvanced = ({ apiUrl = null }) => {
  // ==================== STATI ====================
  const [mapData, setMapData] = useState(mapDataStatic);
  const [selectedRooms, setSelectedRooms] = useState(new Set());
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, regular, stairwell
  const [showMetadata, setShowMetadata] = useState(true);
  const [history, setHistory] = useState([mapDataStatic]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const svgRef = useRef(null);

  const { canvas, colors, borders, grid, rooms, walls, stairs, markers } = mapData;

  // ==================== API FUNCTIONS ====================
  
  const fetchFromAPI = useCallback(async () => {
    if (!apiUrl) return;
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/map`);
      const data = await response.json();
      setMapData(data);
      setHistory([data]);
      setHistoryIndex(0);
      showNotification('Dati caricati da API', 'success');
    } catch (error) {
      console.error('Errore caricamento API:', error);
      showNotification('Errore nel caricamento dati', 'error');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const saveToAPI = useCallback(async () => {
    if (!apiUrl) return;
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}/map`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mapData)
      });
      
      if (response.ok) {
        showNotification('Dati salvati su API', 'success');
      }
    } catch (error) {
      console.error('Errore salvataggio API:', error);
      showNotification('Errore nel salvataggio', 'error');
    } finally {
      setLoading(false);
    }
  }, [mapData, apiUrl]);

  // ==================== HISTORY (UNDO/REDO) ====================

  const addToHistory = (newData) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setMapData(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setMapData(history[historyIndex + 1]);
    }
  };

  // ==================== ROOM MANAGEMENT ====================

  const selectRoom = (roomId, multiSelect = false) => {
    setSelectedRooms((prev) => {
      const newSet = new Set(prev);
      if (multiSelect) {
        if (newSet.has(roomId)) {
          newSet.delete(roomId);
        } else {
          newSet.add(roomId);
        }
      } else {
        if (newSet.has(roomId) && newSet.size === 1) {
          newSet.clear();
        } else {
          newSet.clear();
          newSet.add(roomId);
        }
      }
      return newSet;
    });
  };

  const updateRoom = (roomId, updates) => {
    const newRooms = mapData.rooms.map((room) =>
      room.id === roomId ? { ...room, ...updates } : room
    );
    const newData = { ...mapData, rooms: newRooms };
    setMapData(newData);
    addToHistory(newData);
  };

  const deleteRoom = (roomId) => {
    const newRooms = mapData.rooms.filter((room) => room.id !== roomId);
    const newData = { ...mapData, rooms: newRooms };
    setMapData(newData);
    addToHistory(newData);
    setSelectedRooms((prev) => {
      const newSet = new Set(prev);
      newSet.delete(roomId);
      return newSet;
    });
  };

  const createRoom = (newRoom) => {
    const newRooms = [...mapData.rooms, newRoom];
    const newData = { ...mapData, rooms: newRooms };
    setMapData(newData);
    addToHistory(newData);
  };

  // ==================== FILTRI E RICERCA ====================

  const getFilteredRooms = () => {
    let filtered = mapData.rooms;

    // Filtro per tipo
    if (filterType !== 'all') {
      filtered = filtered.filter((room) => room.type === filterType);
    }

    // Filtro per ricerca
    if (searchTerm) {
      filtered = filtered.filter((room) =>
        room.id.toString().includes(searchTerm) ||
        room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (room.description && room.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return filtered;
  };

  const highlightMatches = (roomId) => {
    if (!searchTerm) return false;
    const room = mapData.rooms.find((r) => r.id === roomId);
    return (
      room &&
      (room.id.toString().includes(searchTerm) ||
        room.name.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // ==================== UTILITIES ====================

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(mapData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mappatura_reti_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const importFromJSON = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        setMapData(imported);
        addToHistory(imported);
        showNotification('Dati importati con successo', 'success');
      } catch (error) {
        showNotification('Errore nel parsing JSON', 'error');
      }
    };
    reader.readAsText(file);
  };

  const getRoomStyle = (room) => {
    const isSelected = selectedRooms.has(room.id);
    const isHovered = hoveredRoom === room.id;
    const isHighlighted = highlightMatches(room.id);

    if (isSelected) return '#FFFF00';
    if (isHighlighted) return '#CCFFCC';
    if (isHovered) return '#E6E6FA';
    return room.color;
  };

  // ==================== RENDER FUNCTIONS ====================

  const renderGrid = () => {
    return grid.vertical_lines.map((line, idx) => (
      <line
        key={`grid-${idx}`}
        x1={line.x}
        y1={15}
        x2={line.x}
        y2={785}
        stroke={line.color}
        strokeWidth="1"
        opacity="0.3"
      />
    ));
  };

  const renderBorders = () => {
    return (
      <>
        <rect
          x={0}
          y={0}
          width={canvas.width}
          height={canvas.height}
          fill={colors.background}
        />
        <rect
          x={0}
          y={0}
          width={canvas.width}
          height={canvas.height}
          fill="none"
          stroke={colors.border_top}
          strokeWidth="3"
        />
      </>
    );
  };

  const renderWalls = () => {
    return walls.map((wall) => {
      let pathData = '';
      if (wall.curved && wall.points.length > 2) {
        pathData += `M ${wall.points[0].x} ${wall.points[0].y}`;
        for (let i = 1; i < wall.points.length; i++) {
          const prev = wall.points[i - 1];
          const curr = wall.points[i];
          const next = wall.points[i + 1] || curr;

          const dx = next.x - prev.x;
          const dy = next.y - prev.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const radius = Math.min(wall.curveRadius || 10, distance / 3);

          const controlX = curr.x - (radius * dx) / distance;
          const controlY = curr.y - (radius * dy) / distance;

          pathData += ` Q ${controlX} ${controlY} ${curr.x} ${curr.y}`;
        }
      } else {
        pathData += `M ${wall.points[0].x} ${wall.points[0].y}`;
        for (let i = 1; i < wall.points.length; i++) {
          pathData += ` L ${wall.points[i].x} ${wall.points[i].y}`;
        }
      }

      return (
        <path
          key={wall.id}
          d={pathData}
          stroke={wall.color}
          strokeWidth={wall.thickness}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    });
  };

  const renderRooms = () => {
    return getFilteredRooms().map((room) => {
      const isSelected = selectedRooms.has(room.id);
      const isHovered = hoveredRoom === room.id;

      return (
        <g key={room.id}>
          <rect
            x={room.x}
            y={room.y}
            width={room.width}
            height={room.height}
            fill={getRoomStyle(room)}
            stroke={room.borderColor}
            strokeWidth={room.borderThickness}
            opacity={isHovered ? 0.95 : 1}
            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
            onClick={(e) => selectRoom(room.id, e.ctrlKey || e.metaKey)}
            onMouseEnter={() => setHoveredRoom(room.id)}
            onMouseLeave={() => setHoveredRoom(null)}
          />

          {room.hasStairPattern && (
            <>
              {Array.from({ length: Math.ceil(room.height / 8) }).map((_, i) => (
                <line
                  key={`stair-${room.id}-${i}`}
                  x1={room.x + 5}
                  y1={room.y + i * 8}
                  x2={room.x + room.width - 5}
                  y2={room.y + i * 8}
                  stroke={colors.stair_pattern}
                  strokeWidth="1"
                  opacity="0.7"
                  pointerEvents="none"
                />
              ))}
            </>
          )}

          <text
            x={room.textX}
            y={room.textY}
            fontSize="48"
            fontWeight="bold"
            fill={colors.text}
            textAnchor="middle"
            dominantBaseline="middle"
            pointerEvents="none"
            style={{ fontFamily: 'Arial, sans-serif', userSelect: 'none' }}
          >
            {room.id}
          </text>

          {isSelected && (
            <rect
              x={room.x - 3}
              y={room.y - 3}
              width={room.width + 6}
              height={room.height + 6}
              fill="none"
              stroke="#FF0000"
              strokeWidth="3"
              strokeDasharray="5,5"
              pointerEvents="none"
            />
          )}
        </g>
      );
    });
  };

  const renderMarkers = () => {
    return markers.map((marker, idx) => (
      <rect
        key={`marker-${idx}`}
        x={marker.x - 5}
        y={marker.y - 5}
        width="10"
        height="10"
        fill={colors.marker}
        stroke="#000"
        strokeWidth="1"
      />
    ));
  };

  // ==================== COMPONENT RENDER ====================

  const selectedRoomData = selectedRooms.size === 1 
    ? mapData.rooms.find((r) => r.id === Array.from(selectedRooms)[0])
    : null;

  return (
    <div style={styles.container}>
      {/* TOOLBAR */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarSection}>
          <button style={styles.button} onClick={fetchFromAPI} disabled={!apiUrl || loading}>
            {loading ? '⏳ Loading...' : '📥 Load'}
          </button>
          <button style={styles.button} onClick={saveToAPI} disabled={!apiUrl || loading}>
            {loading ? '⏳ Saving...' : '💾 Save'}
          </button>
          <button style={styles.button} onClick={exportToJSON}>
            📤 Export JSON
          </button>
          <label style={styles.button}>
            📂 Import
            <input
              type="file"
              accept=".json"
              onChange={(e) => importFromJSON(e.target.files[0])}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <div style={styles.toolbarSection}>
          <button style={styles.button} onClick={undo} disabled={historyIndex === 0}>
            ↶ Undo
          </button>
          <button style={styles.button} onClick={redo} disabled={historyIndex === history.length - 1}>
            ↷ Redo
          </button>
          <button style={styles.button} onClick={() => setEditMode(!editMode)}>
            {editMode ? '✓ Done' : '✎ Edit'}
          </button>
        </div>

        <div style={styles.toolbarSection}>
          <input
            type="text"
            placeholder="🔍 Cerca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.input}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={styles.select}
          >
            <option value="all">Tutti</option>
            <option value="regular">Normali</option>
            <option value="stairwell">Scale</option>
          </select>
        </div>

        <div style={styles.toolbarSection}>
          <span style={styles.info}>
            Zoom: {(zoom * 100).toFixed(0)}%
          </span>
          <span style={styles.info}>
            Selezionati: {selectedRooms.size}
          </span>
        </div>
      </div>

      {/* NOTIFICATION */}
      {notification && (
        <div style={{
          ...styles.notification,
          backgroundColor: notification.type === 'error' ? '#ff4444' : '#44ff44'
        }}>
          {notification.message}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={styles.mainContainer}>
        {/* SVG CANVAS */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${canvas.width} ${canvas.height}`}
          style={{
            ...styles.svg,
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`
          }}
          onWheel={(e) => {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)));
          }}
        >
          {renderBorders()}
          {renderGrid()}
          {renderWalls()}
          {renderRooms()}
          {renderMarkers()}
        </svg>

        {/* SIDE PANEL */}
        {selectedRoomData && (
          <div style={styles.sidePanel}>
            <h3 style={styles.panelTitle}>Ambiente {selectedRoomData.id}</h3>
            
            {showMetadata && selectedRoomData.metadata && (
              <div style={styles.metadata}>
                {Object.entries(selectedRoomData.metadata).map(([key, value]) => (
                  <div key={key} style={styles.metadataItem}>
                    <strong>{key}:</strong> {String(value)}
                  </div>
                ))}
              </div>
            )}

            {editMode && (
              <div style={styles.editForm}>
                <input
                  type="text"
                  placeholder="Nome"
                  defaultValue={selectedRoomData.name}
                  onBlur={(e) => updateRoom(selectedRoomData.id, { name: e.target.value })}
                  style={styles.formInput}
                />
                <textarea
                  placeholder="Descrizione"
                  defaultValue={selectedRoomData.description || ''}
                  onBlur={(e) => updateRoom(selectedRoomData.id, { description: e.target.value })}
                  style={styles.formInput}
                />
              </div>
            )}

            {selectedRoomData.link && (
              <button
                style={styles.linkButton}
                onClick={() => {
                  if (selectedRoomData.link.type === 'external') {
                    window.open(selectedRoomData.link.url, '_blank');
                  }
                }}
              >
                🔗 {selectedRoomData.link.label}
              </button>
            )}

            <button
              style={styles.deleteButton}
              onClick={() => {
                if (window.confirm(`Eliminare ${selectedRoomData.name}?`)) {
                  deleteRoom(selectedRoomData.id);
                }
              }}
            >
              🗑️ Elimina
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== STYLES ====================

const styles = {
  container: {
    width: '100%',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#f5f5f5',
    fontFamily: 'Arial, sans-serif'
  },
  toolbar: {
    display: 'flex',
    gap: '20px',
    padding: '10px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  toolbarSection: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  button: {
    padding: '8px 12px',
    backgroundColor: '#0000FF',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  input: {
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '12px'
  },
  select: {
    padding: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '12px'
  },
  info: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#333'
  },
  mainContainer: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden'
  },
  svg: {
    flex: 1,
    transformOrigin: '0 0',
    cursor: 'grab'
  },
  sidePanel: {
    width: '300px',
    backgroundColor: '#fff',
    borderLeft: '1px solid #ddd',
    padding: '15px',
    overflowY: 'auto',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)'
  },
  panelTitle: {
    margin: '0 0 15px 0',
    color: '#0000FF',
    fontSize: '18px'
  },
  metadata: {
    marginBottom: '15px'
  },
  metadataItem: {
    marginBottom: '8px',
    fontSize: '12px',
    padding: '8px',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px'
  },
  editForm: {
    marginBottom: '15px'
  },
  formInput: {
    width: '100%',
    padding: '8px',
    marginBottom: '8px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '12px',
    boxSizing: 'border-box'
  },
  linkButton: {
    width: '100%',
    padding: '8px',
    marginBottom: '8px',
    backgroundColor: '#00AA00',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  deleteButton: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#FF0000',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  notification: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '15px 20px',
    backgroundColor: '#44ff44',
    color: '#000',
    borderRadius: '4px',
    zIndex: 1000,
    fontWeight: 'bold'
  }
};

export default MappaaturaRetiAdvanced;
