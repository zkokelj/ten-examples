import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ZigaTokenModule = buildModule("ZigaTokenModule", (m) => {
  const token = m.contract("ZigaToken");

  m.call(token, "transfer", [
    "0x10DeC2baF2944Ce99710B4319Ec7C7B619E70a0E",  // Address 1
    100_000n * 10n**18n  // 100,000 ZIGA
  ], { id: "transfer1" });
  
  m.call(token, "transfer", [
    "0x10DeC2baF2944Ce99710B4319Ec7C7B619E70a0E",  // Address 2
    50_000n * 10n**18n  // 50,000 ZIGA
  ], { id: "transfer2" });
  
  m.call(token, "transfer", [
    "0x10DeC2baF2944Ce99710B4319Ec7C7B619E70a0E",  // Address 3
    25_000n * 10n**18n  // 25,000 ZIGA
  ], { id: "transfer3" });

  return { token };
});

export default ZigaTokenModule;