"use client";

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="mt-8 rounded-xl bg-black px-5 py-3 font-semibold text-white print:hidden">
      Imprimir
    </button>
  );
}
