import React, { useRef, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import { SearchBox } from "@mapbox/search-js-react";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const initial = (handle) => (handle || "?").charAt(0).toUpperCase();

// 프로필 핀: 생성자 원형(빨간 링) + 함께 글 쓴 멤버 스택
// 백엔드 필요 필드: pin.creator_handle (string), pin.author_handles (string[])
// 필드가 아직 없으면 "?" 폴백으로 렌더링됨 (동작은 함)
const PinMarker = ({ pin, onClick }) => {
  const extras = (pin.author_handles || []).filter(
    (h) => h !== pin.creator_handle,
  );
  const shown = extras.slice(0, 2);
  const rest = extras.length - shown.length;

  return (
    <div className="pin-marker" onClick={onClick}>
      <div className="pin-head">
        <div className="pin-face">
          {pin.creator_avatar_url ? (
            <img className="pin-face-img" src={pin.creator_avatar_url} alt="" />
          ) : (
            initial(pin.creator_handle)
          )}
        </div>
        {extras.length > 0 && (
          <div className="pin-extras">
            {shown.map((h) => (
              <span className="pin-extra" key={h}>
                {initial(h)}
              </span>
            ))}
            {rest > 0 && <span className="pin-extra">+{rest}</span>}
          </div>
        )}
      </div>
      <div className="pin-tail" />
      <span className="pin-label">{pin.title}</span>
    </div>
  );
};

const MapView = ({ pins = [], onMapClick, onPinClick }) => {
  const mapRef = useRef();
  const [searchValue, setSearchValue] = useState("");
  const [mapInstance, setMapInstance] = useState(null);

  const handleMapClick = async (e) => {
    const lat = e.lngLat.lat;
    const lng = e.lngLat.lng;
    let title = "";

    // 1순위: 화면에 실제 렌더링된 POI 레이블을 직접 읽음
    const map = mapRef.current?.getMap();
    if (map) {
      const px = e.point;
      const bbox = [
        [px.x - 10, px.y - 10],
        [px.x + 10, px.y + 10],
      ];
      const candidateLayers = ["poi-label", "transit-label", "airport-label"];
      const existingLayers = candidateLayers.filter((id) => {
        try {
          return !!map.getLayer(id);
        } catch {
          return false;
        }
      });
      if (existingLayers.length > 0) {
        const features = map.queryRenderedFeatures(bbox, {
          layers: existingLayers,
        });
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
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=poi&language=ko&limit=1`,
        );
        const poiData = await poiRes.json();
        if (poiData.features?.length) title = poiData.features[0].text || "";
      } catch {}
    }
    if (!title) {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,neighborhood,locality,place&language=ko&limit=1`,
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
    const title =
      feature.properties.name || feature.properties.full_address || "";

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
              borderRadius: "14px",
              boxShadow: "0 2px 16px rgba(16,16,18,0.08)",
              colorBackground: "#FFFFFF",
              colorBackgroundHover: "#FCFCFA",
              colorText: "#101012",
              colorPrimary: "#101012",
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
            <PinMarker
              pin={pin}
              onClick={(e) => {
                e.stopPropagation();
                onPinClick?.(pin);
              }}
            />
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

export default MapView;
