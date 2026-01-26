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
    if (globeRef.current) {
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;

      // 전달받은 altitude 값을 적용합니다.
      globeRef.current.pointOfView({ altitude });
    }
  }, [altitude, width, height]); // altitude가 바뀌면 시점도 다시 잡음

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
        pointsData={pins}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => "#7c3aed"}
        onGlobeClick={(coords) => onGlobeClick && onGlobeClick(coords)}
      />
    </div>
  );
};

export default MainGlobe;
