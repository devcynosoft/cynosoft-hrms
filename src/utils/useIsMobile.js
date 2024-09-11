import { useEffect, useState } from 'react';

export default function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Check screen size on initial render
    handleResize();

    // Add event listener to monitor window resize
    window.addEventListener('resize', handleResize);

    // Clean up event listener on component unmount
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
