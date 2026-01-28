import React, { useState, useEffect } from 'react';
import mapData from './mappatura_reti_data.json';

const MappaaturaReti = () => {
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [hoveredRoom, setHoveredRoom] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const { canvas, colors, borders, grid, rooms, walls, stairs, markers } = mapData;

  // Renderizar grid
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
        opacity="0.6"
      />
    ));
  };

  // Renderizar bordas
  const renderBorders = () => {
    return (
      <>
        <rect
          x={0}
          y={0}
          width={canvas.width}
          height={canvas.height}
          fill={colors.background}
          stroke={colors.border_top}
          strokeWidth="3"
        />
        <line
          x1={borders.top.x1}
          y1={borders.top.y1}
          x2={borders.top.x2}
          y2={borders.top.y2}
          stroke={borders.top.color}
          strokeWidth={borders.top.thickness}
        />
        <line
          x1={borders.bottom.x1}
          y1={borders.bottom.y1}
          x2={borders.bottom.x2}
          y2={borders.bottom.y2}
          stroke={borders.bottom.color}
          strokeWidth={borders.bottom.thickness}
        />
        <line
          x1={borders.left.x1}
          y1={borders.left.y1}
          x2={borders.left.x2}
          y2={borders.left.y2}
          stroke={borders.left.color}
          strokeWidth={borders.left.thickness}
        />
        <line
          x1={borders.right.x1}
          y1={borders.right.y1}
          x2={borders.right.x2}
          y2={borders.right.y2}
          stroke={borders.right.color}
          strokeWidth={borders.right.thickness}
        />
      </>
    );
  };

  // Renderizar paredes com curvas suaves
  const renderWalls = () => {
    return walls.map((wall) => {
      if (wall.type === 'path') {
        let pathData = '';

        if (wall.curved && wall.points.length > 2) {
          // Usar curvas suaves
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
          // Linhas retas
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
      }
      return null;
    });
  };

  // Renderizar ambientes (rooms)
  const renderRooms = () => {
    return rooms.map((room) => (
      <g key={room.id}>
        {/* Background do ambiente */}
        <rect
          x={room.x}
          y={room.y}
          width={room.width}
          height={room.height}
          fill={room.color}
          stroke={room.borderColor}
          strokeWidth={room.borderThickness}
          opacity={hoveredRoom === room.id ? 0.9 : 1}
          style={{
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => setSelectedRoom(room)}
          onMouseEnter={() => setHoveredRoom(room.id)}
          onMouseLeave={() => setHoveredRoom(null)}
        />

        {/* Padrão de escada (se aplicável) */}
        {room.hasStairPattern && (
          <StairPattern room={room} />
        )}

        {/* Número do ambiente */}
        <text
          x={room.textX}
          y={room.textY}
          fontSize="48"
          fontWeight="bold"
          fill={colors.text}
          textAnchor="middle"
          dominantBaseline="middle"
          pointerEvents="none"
          style={{
            fontFamily: 'Arial, sans-serif',
            userSelect: 'none'
          }}
        >
          {room.id}
        </text>

        {/* Highlight de seleção */}
        {selectedRoom?.id === room.id && (
          <rect
            x={room.x - 3}
            y={room.y - 3}
            width={room.width + 6}
            height={room.height + 6}
            fill="none"
            stroke={colors.selection_highlight}
            strokeWidth="3"
            strokeDasharray="5,5"
            pointerEvents="none"
          />
        )}
      </g>
    ));
  };

  // Componente para padrão de escada
  const StairPattern = ({ room }) => {
    const lineSpacing = 8;
    const lines = [];

    for (let i = 0; i < room.height; i += lineSpacing) {
      lines.push(
        <line
          key={`stair-line-${room.id}-${i}`}
          x1={room.x + 5}
          y1={room.y + i}
          x2={room.x + room.width - 5}
          y2={room.y + i}
          stroke={colors.stair_pattern}
          strokeWidth="1"
          opacity="0.7"
          pointerEvents="none"
        />
      );
    }

    return <>{lines}</>;
  };

  // Renderizar escadas
  const renderStairs = () => {
    return stairs.map((stair) => (
      <g key={stair.id}>
        {/* Padrão de linhas horizontais */}
        {Array.from({ length: Math.ceil(stair.height / stair.lineSpacing) }).map(
          (_, i) => (
            <line
              key={`stair-${stair.id}-line-${i}`}
              x1={stair.x}
              y1={stair.y + i * stair.lineSpacing}
              x2={stair.x + stair.width}
              y2={stair.y + i * stair.lineSpacing}
              stroke={stair.lineColor}
              strokeWidth="1"
              opacity="0.8"
            />
          )
        )}

        {/* Borda da escada */}
        <rect
          x={stair.x}
          y={stair.y}
          width={stair.width}
          height={stair.height}
          fill="none"
          stroke={stair.borderColor}
          strokeWidth={stair.borderThickness}
        />
      </g>
    ));
  };

  // Renderizar marcadores
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

  const handleZoom = (e) => {
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)));
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedRoom(null);
  };

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
      {/* Controles */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 100,
          backgroundColor: '#fff',
          padding: '10px',
          borderRadius: '5px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}
      >
        <button
          onClick={handleReset}
          style={{
            padding: '8px 15px',
            marginRight: '10px',
            backgroundColor: '#0000FF',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Reset View
        </button>
        <span style={{ marginRight: '10px', fontWeight: 'bold' }}>
          Zoom: {(zoom * 100).toFixed(0)}%
        </span>
      </div>

      {/* Painel de seleção */}
      {selectedRoom && (
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            backgroundColor: '#fff',
            padding: '15px',
            borderRadius: '8px',
            boxShadow: '0 2px 15px rgba(0,0,0,0.2)',
            maxWidth: '300px',
            zIndex: 100
          }}
        >
          <h3 style={{ margin: '0 0 10px 0', color: '#0000FF' }}>
            Ambiente {selectedRoom.id}
          </h3>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Nome:</strong> {selectedRoom.name}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Tipo:</strong> {selectedRoom.type}
          </p>
          <p style={{ margin: '5px 0', fontSize: '14px' }}>
            <strong>Dimensioni:</strong> {selectedRoom.width}x{selectedRoom.height}px
          </p>
          {selectedRoom.description && (
            <p style={{ margin: '5px 0', fontSize: '14px' }}>
              <strong>Descrizione:</strong> {selectedRoom.description}
            </p>
          )}
          <button
            onClick={() => setSelectedRoom(null)}
            style={{
              marginTop: '10px',
              padding: '6px 12px',
              backgroundColor: '#FF00FF',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Chiudi
          </button>
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        viewBox={`0 0 ${canvas.width} ${canvas.height}`}
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
          transformOrigin: '0 0',
          cursor: 'grab'
        }}
        onWheel={handleZoom}
      >
        {/* Background */}
        <rect width={canvas.width} height={canvas.height} fill={colors.background} />

        {/* Grid */}
        {renderGrid()}

        {/* Bordas */}
        {renderBorders()}

        {/* Pareti */}
        {renderWalls()}

        {/* Ambientes */}
        {renderRooms()}

        {/* Scale */}
        {renderStairs()}

        {/* Marcatori */}
        {renderMarkers()}
      </svg>

      {/* Legenda (opzionale) */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          backgroundColor: '#fff',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 15px rgba(0,0,0,0.2)',
          fontSize: '12px',
          zIndex: 100
        }}
      >
        <h4 style={{ margin: '0 0 8px 0' }}>Legenda</h4>
        <div style={{ marginBottom: '5px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              backgroundColor: '#0000FF',
              marginRight: '5px'
            }}
          ></span>
          Pareti
        </div>
        <div style={{ marginBottom: '5px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              backgroundColor: '#FF00FF',
              marginRight: '5px'
            }}
          ></span>
          Scale
        </div>
        <div>
          <span
            style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              backgroundColor: '#FF00FF',
              marginRight: '5px'
            }}
          ></span>
          Marcatori
        </div>
      </div>
    </div>
  );
};

export default MappaaturaReti;
