import { Composition } from "remotion";
import { SupplierTutorial } from "./SupplierTutorial";
import "./style.css";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="SupplierTutorial"
        component={SupplierTutorial}
        durationInFrames={2310}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
