import React, { useRef, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import { SearchBox } from "@mapbox/search-js-react";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const MapView = ({ pins = [], onMapClick, onPinClick }) => {
  const mapRef = useRef();
  const [searchValue, setSearchValue] = useState("");
  const [mapInstance, setMapInstance] = useState(null);

  const handleMapClick = async (e) => {
    const lat = e.lngLat.lat;
    const lng = e.lngLat.lng;
    let title = "";

    // 1순위: 화면에 실제 렌더링된 POI 레이블을 직접 읽음 (구글맵/카카오맵 방식)
    const map = mapRef.current?.getMap();
    if (map) {
      const px = e.point;
      const bbox = [[px.x - 10, px.y - 10], [px.x + 10, px.y + 10]];
      const candidateLayers = ["poi-label", "transit-label", "airport-label"];
      const existingLayers = candidateLayers.filter((id) => {
        try { return !!map.getLayer(id); } catch { return false; }
      });
      if (existingLayers.length > 0) {
        const features = map.queryRenderedFeatures(bbox, { layers: existingLayers });
        if (features.length > 0) {
          const f = features[0].properties;
          title = f.name_ko || f.name_local || f.name || "";
        }
      }
    }

    // 2순위: 역지오코딩 API fallback
    if (!title) {
      try {
        const poiRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=poi&language=ko&limit=1`
        );
        const poiData = await poiRes.json();
        if (poiData.features?.length) title = poiData.features[0].text || "";
      } catch {}
    }
    if (!title) {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,neighborhood,locality,place&language=ko&limit=1`
        );
        const data = await res.json();
        if (data.features?.length) title = data.features[0].text || "";
      } catch {}
    }

    if (onMapClick) onMapClick({ lat, lng, title });
  };

  const handlePlaceSelect = (result) => {
    const feature = result.features[0];
    const [lng, lat] = feature.geometry.coordinates;
    const title = feature.properties.name || feature.properties.full_address || "";

    mapRef.current?.flyTo({ center: [lng, lat], zoom: 15 });
    setSearchValue("");
    if (onMapClick) onMapClick({ lat, lng, title });
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* 검색창 */}
      <div style={styles.searchWrapper}>
        <SearchBox
          accessToken={MAPBOX_TOKEN}
          map={mapInstance}
          mapboxgl={mapboxgl}
          value={searchValue}
          onChange={setSearchValue}
          onRetrieve={handlePlaceSelect}
          placeholder="장소를 검색하세요..."
          theme={{
            variables: {
              fontFamily: "inherit",
              fontWeightBold: "700",
              borderRadius: "25px",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              colorBackground: "#ffffff",
              colorBackgroundHover: "#f8f8f8",
              colorText: "#222",
              colorPrimary: "#111",
            },
          }}
        />
      </div>

      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{ longitude: 0, latitude: 20, zoom: 1.5 }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        projection="globe"
        fog={{}}
        onClick={handleMapClick}
        onLoad={(e) => setMapInstance(e.target)}
      >
        <NavigationControl position="top-right" style={{ marginTop: "80px" }} />

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            longitude={Number(pin.lng)}
            latitude={Number(pin.lat)}
            anchor="bottom"
          >
            <div
              style={{ ...pinStyles.wrapper, cursor: onPinClick ? "pointer" : "default" }}
              onClick={(e) => { e.stopPropagation(); onPinClick?.(pin); }}
            >
              <span style={pinStyles.emoji}>📍</span>
              <span style={pinStyles.label}>{pin.title}</span>
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  );
};

const styles = {
  searchWrapper: {
    position: "absolute",
    top: "16px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "360px",
    zIndex: 10,
  },
};

const pinStyles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    pointerEvents: "auto",
  },
  emoji: {
    fontSize: "22px",
    filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
    lineHeight: 1,
  },
  label: {
    background: "rgba(255,255,255,0.92)",
    color: "#222",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "11px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    boxShadow: "0 1px 6px rgba(0,0,0,0.2)",
    marginTop: "4px",
  },
};

export default MapView;
