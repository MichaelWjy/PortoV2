import Image from "next/image";

/** The MW mark. Both theme variants render; CSS shows the one matching <html data-theme>. */
export function Logo() {
  return (
    <>
      <Image className="logo-dark" src="/logo-mark-dark.png" width={181} height={96} alt="" priority unoptimized />
      <Image className="logo-light" src="/logo-mark-light.png" width={180} height={96} alt="" priority unoptimized />
    </>
  );
}
