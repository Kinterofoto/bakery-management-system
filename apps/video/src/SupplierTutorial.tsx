import { Sequence } from "remotion";
import { Intro } from "./scenes/Intro";
import { RegistroStep1 } from "./scenes/RegistroStep1";
import { RegistroStep2 } from "./scenes/RegistroStep2";
import { RegistroStep3 } from "./scenes/RegistroStep3";
import { RegistroStep4 } from "./scenes/RegistroStep4";
import { RegistroExitoso } from "./scenes/RegistroExitoso";
import { PortalIntro } from "./scenes/PortalIntro";
import { PortalMateriales } from "./scenes/PortalMateriales";
import { PortalAgregarMaterial } from "./scenes/PortalAgregarMaterial";
import { PortalOrdenes } from "./scenes/PortalOrdenes";
import { Outro } from "./scenes/Outro";

// 30 fps, each scene duration in frames
const SCENES = [
  { component: Intro, duration: 150, name: "Intro" },                    // 5s
  { component: RegistroStep1, duration: 240, name: "Registro-Empresa" },  // 8s
  { component: RegistroStep2, duration: 210, name: "Registro-Contacto" }, // 7s
  { component: RegistroStep3, duration: 210, name: "Registro-Entregas" }, // 7s
  { component: RegistroStep4, duration: 180, name: "Registro-Revision" }, // 6s
  { component: RegistroExitoso, duration: 150, name: "Registro-Exitoso" }, // 5s
  { component: PortalIntro, duration: 180, name: "Portal-Intro" },        // 6s
  { component: PortalMateriales, duration: 270, name: "Portal-Materiales" }, // 9s
  { component: PortalAgregarMaterial, duration: 240, name: "Portal-AgregarMaterial" }, // 8s
  { component: PortalOrdenes, duration: 270, name: "Portal-Ordenes" },     // 9s
  { component: Outro, duration: 210, name: "Outro" },                      // 7s
];

// Total: ~77s at 30fps = 2310 frames
// Composition set to 2700 frames (90s) for safety margin

export const SupplierTutorial: React.FC = () => {
  let currentFrame = 0;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      {SCENES.map((scene) => {
        const from = currentFrame;
        currentFrame += scene.duration;
        const Component = scene.component;

        return (
          <Sequence
            key={scene.name}
            from={from}
            durationInFrames={scene.duration}
            name={scene.name}
          >
            <Component />
          </Sequence>
        );
      })}
    </div>
  );
};
