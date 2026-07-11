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
        atmosphereColor="#cae2ff"
        atmosphereAltitude={0.15}
        htmlElementsData={pins}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.01}
        htmlTransitionDuration={0}
        htmlElement={(pin) => {
          const el = document.createElement("div");
          el.style.cssText =
            "display:flex;flex-direction:column;align-items:center;pointer-events:none;";
          el.innerHTML = `
            <div style="font-size:22px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.35));">📍</div>
            <div style="background:rgba(255,255,255,0.92);color:#222;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 1px 6px rgba(0,0,0,0.18);margin-top:4px;">${pin.title}</div>
          `;
          return el;
        }}
        onGlobeClick={(coords) => onGlobeClick && onGlobeClick(coords)}
      />
    </div>
  );
};

export default MainGlobe;
