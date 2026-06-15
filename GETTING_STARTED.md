# 🚀 GETTING STARTED - GITAM CAN-7USAT

Complete setup guide for the rocket flight avionics and ground control system.

---

## 📋 PREREQUISITES

### Required Software
- **Python 3.11+** - [Download](https://www.python.org/downloads/)
- **Node.js 20+** - [Download](https://nodejs.org/) (for frontend)
- **Git** - [Download](https://git-scm.com/)
- **VS Code** (recommended) - [Download](https://code.visualstudio.com/)

### Optional (for production)
- **PostgreSQL 16+** - [Download](https://www.postgresql.org/download/)
- **Arduino IDE / PlatformIO** - For embedded development

---

## 🏃 QUICK START (5 Minutes)

### Step 1: Setup Backend (Ground Control Station)

```bash
# Run the automated setup script
setup_backend.bat

# This will:
# ✅ Create Python virtual environment
# ✅ Install all dependencies
# ✅ Run tests to verify installation
```

### Step 2: Start the Server

```bash
# Option A: Use quick start script
cd backend
run_server.bat

# Option B: Manual start
cd backend
venv\Scripts\activate
python -m app.main
```

The server will start at: **http://localhost:8000**

### Step 3: Test the API

Open your browser and visit:
- **Dashboard**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Interactive Swagger UI)
- **Health Check**: http://localhost:8000/api/health
- **Live Telemetry**: http://localhost:8000/api/telemetry/latest

---

## 📊 TESTING THE SYSTEM

### Backend Tests

```bash
cd backend
venv\Scripts\activate

# Run all tests
pytest

# Run with coverage report
pytest --cov=app --cov-report=html

# Run specific test
pytest tests/test_telemetry_decoder.py -v
```

### WebSocket Test (Browser Console)

```javascript
// Open browser console (F12) and run:
const ws = new WebSocket('ws://localhost:8000/ws/telemetry');

ws.onopen = () => console.log('✅ Connected!');
ws.onmessage = (e) => console.log('📡 Data:', JSON.parse(e.data));
ws.onerror = (e) => console.error('❌ Error:', e);
```

You should see real-time telemetry data streaming at 10 Hz!

---

## 🎯 PROJECT STRUCTURE

```
rckt/
├── backend/                          # Ground Control Station (Python)
│   ├── app/
│   │   ├── main.py                  # FastAPI application
│   │   ├── models.py                # Data models (Pydantic)
│   │   ├── config.py                # Configuration management
│   │   ├── telemetry_decoder.py    # Binary packet decoder
│   │   ├── mock_data_generator.py  # Flight simulation
│   │   ├── kalman_filter.py        # Sensor fusion (NEW!)
│   │   └── flight_state_machine.py # State machine (NEW!)
│   ├── tests/                       # Test suite
│   ├── venv/                        # Virtual environment
│   ├── requirements.txt             # Python dependencies
│   ├── .env                         # Configuration
│   └── README.md
│
├── frontend/                         # Dashboard (React) - COMING NEXT
│   └── (To be created)
│
├── embedded/                         # Flight Computer (C++) - COMING NEXT
│   └── (To be created)
│
├── docs/                            # Documentation & References
│   ├── GITAM_CAN7USAT_Proposal_2026.pdf
│   ├── rckt_kushinagar.csv
│   └── (Other reference files)
│
├── PROJECT_OVERVIEW.md              # Mission overview
├── OPTIMAL_STACK_ANALYSIS.md        # Technology stack analysis
├── GETTING_STARTED.md               # This file
└── setup_backend.bat                # Automated setup script
```

---

## 🔧 CONFIGURATION

### Backend Configuration (.env file)

```bash
# Server
HOST=0.0.0.0
PORT=8000
RELOAD=true

# Serial Port (XBee)
SERIAL_PORT=COM3              # Change to your XBee port
SERIAL_BAUDRATE=57600

# Database (optional)
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/rocket_telemetry

# Mock Mode (for testing without hardware)
MOCK_MODE=true                # Set to false for real hardware
MOCK_DATA_RATE=10             # Hz

# Logging
LOG_LEVEL=INFO                # DEBUG, INFO, WARNING, ERROR
```

### Finding Your Serial Port

```bash
# Windows
python -c "import serial.tools.list_ports; [print(p.device) for p in serial.tools.list_ports.comports()]"

# Output example:
# COM3
# COM4
```

---

## 🎓 LEARNING RESOURCES

### Recommended YouTube Channels
1. **BPS.space** - https://www.youtube.com/@BPSspace
   - Falcon Heavy model rocket series
   - Flight computer design
   - Thrust vector control

2. **Lafayette Systems** - https://www.youtube.com/@LafayetteSystems
   - Ground station software
   - Telemetry systems
   - Real-time dashboards

### Reference Repositories
1. **trentrand/rocket-flight-computer**
   - https://github.com/trentrand/rocket-flight-computer
   - Teensy-based flight computer

2. **rckTom/alturia-firmware**
   - https://github.com/rckTom/alturia-firmware
   - Production-grade avionics firmware
   - Kalman filter implementation

3. **SparkyVT/HPR-Rocket-Flight-Computer**
   - https://github.com/SparkyVT/HPR-Rocket-Flight-Computer
   - High-power rocketry flight computer
   - 1000 Hz data logging

---

## 🐛 TROUBLESHOOTING

### Issue: "Python not found"
**Solution**: Install Python 3.11+ and add to PATH during installation

### Issue: "pip install fails"
**Solution**: 
```bash
python -m pip install --upgrade pip
python -m pip install --upgrade setuptools wheel
```

### Issue: "Virtual environment activation fails"
**Solution**: Run PowerShell as Administrator and execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: "Tests fail"
**Solution**: Check Python version (must be 3.11+)
```bash
python --version
```

### Issue: "WebSocket connection refused"
**Solution**: 
1. Check if server is running
2. Verify firewall allows port 8000
3. Check CORS settings in `backend/app/config.py`

---

## 📈 PERFORMANCE BENCHMARKS

### Expected Performance (Mock Mode)
- **Packet Generation**: 10 Hz (100ms interval)
- **Packet Decode Time**: <2ms
- **WebSocket Broadcast**: <5ms
- **End-to-End Latency**: <15ms
- **Memory Usage**: ~150 MB

### Test Results
```bash
# Run performance test
cd backend
venv\Scripts\activate
python -m pytest tests/ -v --durations=10
```

---

## 🚀 NEXT STEPS

### Phase 1: Backend ✅ COMPLETE
- [x] FastAPI server with WebSocket
- [x] Binary telemetry decoder
- [x] Mock data generator
- [x] Kalman filter for sensor fusion
- [x] Flight state machine
- [x] Comprehensive tests

### Phase 2: Frontend (NEXT)
- [ ] React + Vite setup
- [ ] Zustand state management
- [ ] uPlot real-time charts
- [ ] React Three Fiber 3D visualization
- [ ] WebSocket integration

### Phase 3: Embedded (AFTER FRONTEND)
- [ ] Teensy 4.1 setup
- [ ] FreeRTOS tasks
- [ ] Sensor drivers (GPS, IMU, Barometer)
- [ ] State machine implementation
- [ ] SD card logging
- [ ] XBee telemetry

---

## 📞 SUPPORT

### Documentation
- **API Docs**: http://localhost:8000/docs (when server is running)
- **Project Overview**: See `PROJECT_OVERVIEW.md`
- **Stack Analysis**: See `OPTIMAL_STACK_ANALYSIS.md`

### Community
- **GitHub Issues**: Report bugs and request features
- **Team Discord**: (Add your Discord link)

---

## ✅ VERIFICATION CHECKLIST

Before proceeding to frontend development:

- [ ] Backend server starts without errors
- [ ] All tests pass (`pytest`)
- [ ] WebSocket connection works
- [ ] Mock telemetry data streams at 10 Hz
- [ ] API endpoints respond correctly
- [ ] Kalman filter produces smooth estimates
- [ ] State machine transitions correctly

---

## 🎉 SUCCESS!

If you've reached this point, your backend is fully operational!

**Next**: Let's build the frontend dashboard with real-time 3D visualization.

Run: `setup_frontend.bat` (coming soon)

---

**GITAM University - IN-SPACe CAN-7USAT Team**  
*Model Rocketry Competition 2026*
