import React, { useEffect, useRef } from "react";
import Globe from "react-globe.gl";

const MainGlobe = ({ pins = [], onGlobeClick }) => {
  const globeRef = useRef();

  // 1. 처음 로딩 시 카메라 위치나 자동 회전 설정
  useEffect(() => {
    if (globeRef.current) {
      // 자동 회전 설정 (SRE 관점에서 리소스 사용 최적화)
      globeRef.current.controls().autoRotate = true;
      globeRef.current.controls().autoRotateSpeed = 0.5;

      // 초기 카메라 거리 조절
      globeRef.current.pointOfView({ altitude: 2.5 });
    }
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", cursor: "crosshair" }}>
      <Globe
        ref={globeRef}
        // 텍스처 (기본 제공 이미지를 사용하거나 나중에 커스텀 이미지를 넣을 수 있습니다)
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundColor="rgba(0,0,0,0)"
        //backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        // 핀 데이터 렌더링 설정
        pointsData={pins}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => "#ff4757"} // 핀 색상 (pinned. 브랜드 컬러)
        pointAltitude={0.1}
        pointRadius={0.5}
        pointsMerge={true} // 성능 최적화
        // 핀 설명 라벨
        pointLabel="label"
        // 2. 상호작용: 지구본 클릭 시 부모 컴포넌트로 좌표 전달
        onGlobeClick={(coords) => {
          if (onGlobeClick) onGlobeClick(coords);
        }}
        // 애니메이션 및 스타일 설정
        animateIn={true}
      />
    </div>
  );
};

export default MainGlobe;
