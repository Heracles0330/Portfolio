"use client"
import dynamic from 'next/dynamic';
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });
const AnimationLottie = ({ animationPath, width }: { animationPath: string, width: string }) => {
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationPath,
    style: {
      width: '95%',
    }
  };

  return (
    <Lottie {...defaultOptions} />
  );
};

export default AnimationLottie;