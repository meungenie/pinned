// frontend/src/components/MainGlobe.js
import React, { useEffect, useRef } from "react";
import Globe from "react-globe.gl";

const MainGlobe = ({
  pins = [],
  onGlobeClick,
  width,
  height,
  altitude = 2.5,
}) => {
  const globeRef = useRef();

  useEffect(() => {
    if (!globeRef.current) return;

    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    globeRef.current.pointOfView({ altitude });

    // 초기 altitude의 90% 미만으로 줌인하면 회전 중지, 복귀하면 재개
    const stopThreshold = altitude * 0.9;
    const handleZoom = () => {
      if (!globeRef.current) return;
      const current = globeRef.current.pointOfView().altitude;
      controls.autoRotate = current >= stopThreshold;
    };

    controls.addEventListener("change", handleZoom);
    return () => {
      controls.removeEventListener("change", handleZoom);
      controls.autoRotate = false;
      if (globeRef.current) globeRef.current.pauseAnimation();
    };
  }, [altitude, width, height]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Globe
        ref={globeRef}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        width={width}
        height={height}
        showAtmosphere={true}
        atmosphereColor="#dbe4ee"
        atmosphereAltitude={0.15}
        htmlElementsData={pins}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.01}
        htmlTransitionDuration={0}
        htmlElement={(pin) => {
          // "색은 핀 하나" — 지구본 위 마커도 지도 핀과 같은 빨간 점
          const el = document.createElement("div");
          el.style.cssText =
            "display:flex;flex-direction:column;align-items:center;pointer-events:none;";
          el.innerHTML = `
            <div style="width:12px;height:12px;border-radius:50%;background:#FF3B1C;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(16,16,18,0.35);"></div>
            <div style="background:rgba(255,255,255,0.94);color:#101012;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;letter-spacing:-0.01em;white-space:nowrap;border:0.5px solid #ECECE8;box-shadow:0 1px 6px rgba(16,16,18,0.14);margin-top:5px;">${pin.title}</div>
          `;
          return el;
        }}
        onGlobeClick={(coords) => onGlobeClick && onGlobeClick(coords)}
      />
    </div>
  );
};

export default MainGlobe;
