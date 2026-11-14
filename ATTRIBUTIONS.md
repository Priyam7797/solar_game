# Imagery, Open Data & Engineering Attributions

## Public-Domain NASA & Research References
- **Moon Surface & Shackleton Crater Environment**: Grounded in **NASA Lunar Reconnaissance Orbiter (LRO)** Diviner temperature maps and LROC south pole illumination references (Credit: *NASA / GSFC / Arizona State University*).
- **Mars Surface & Jezero Crater Environment**: Grounded in **NASA Perseverance MEDA** weather station and **Curiosity REMS / RAD** radiation & dust observations (Credit: *NASA / JPL-Caltech / MSSS*).
- **Solar Flares & Space Weather Alerts (DONKI)**: Grounded in **NASA Community Coordinated Modeling Center (CCMC) Space Weather Database Of Notifications, Knowledge, Information (DONKI)** (`https://kauai.ccmc.gsfc.nasa.gov/DONKI/`).
- **Astronaut Biology & Plant Science (OSDR & ISS Veggie)**: Grounded in **NASA Open Science Data Repository (OSDR / GeneLab)** (`https://osdr.nasa.gov/bio/`) and **NASA ISS Veggie / Advanced Plant Habitat** crop experiments (`Lettuce`, `Radish`, `Potato`, `Beans`).
- **Power Systems**: Modeled after **NASA Kilopower (KRUSTY)** compact fission technology (`10 kW` class steady baseline power).

## Software & Libraries
- **Three.js** (`three`): Procedural 3D habitat, terrain, Earth/Phobos backdrop, and lighting simulation rendered cleanly in browser Canvas/WebGL2.
- **React & Tailwind CSS**: Low-occlusion Mission Control HUD and accessible Grade 3–6 UI cards.
- **Express & Socket.IO**: Server-side NASA DONKI proxy (`/api/donki`) and real-time Co-op Crew / Classroom Teacher sessions.
- **Browser Web Speech API** (`window.speechSynthesis`): Optional local ARIA narration with zero external voice API dependency.
