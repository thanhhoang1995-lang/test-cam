
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import CameraMap from './components/CameraMap';
import CameraTable from './components/CameraTable';
import StatsCard from './components/StatsCard';
import { Camera, CameraStatus, GitHubSettings } from './types';
import { STORAGE_KEYS } from './constants';
import { syncCamerasWithGitHub } from './services/githubService';

const App: React.FC = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<CameraStatus | 'all'>('all');
  const [isPinMode, setIsPinMode] = useState(false);
  const [focusedCamera, setFocusedCamera] = useState<Camera | null>(null);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [viewMode, setViewMode] = useState<'dashboard' | 'multiview'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [ghSettings, setGhSettings] = useState<GitHubSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.GITHUB_SETTINGS);
      return saved ? JSON.parse(saved) : { token: '', gistId: '' };
    } catch {
      return { token: '', gistId: '' };
    }
  });

  const camerasRef = useRef<Camera[]>([]);
  useEffect(() => {
    camerasRef.current = cameras;
  }, [cameras]);

  // Load Initial Data
  useEffect(() => {
    const loadData = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEYS.CAMERAS);
        if (saved) {
          setCameras(JSON.parse(saved));
        } else {
          const initial: Camera[] = [
            { id: '1', name: 'Ngã tư Phan Chu Trinh', ip: '192.168.1.10', address: '99 Phan Chu Trinh, P.9, Đà Lạt', lat: 11.9472, lng: 108.4593, status: CameraStatus.ONLINE, updatedAt: Date.now(), lastCheckAt: Date.now() },
            { id: '2', name: 'Cổng Phường Lâm Viên', ip: '192.168.1.11', address: 'Phường Lâm Viên, Đà Lạt', lat: 11.9412, lng: 108.4583, status: CameraStatus.OFFLINE, updatedAt: Date.now(), lastCheckAt: Date.now() },
          ];
          setCameras(initial);
          localStorage.setItem(STORAGE_KEYS.CAMERAS, JSON.stringify(initial));
        }
      } catch (e) {
        console.error("Error loading data", e);
      } finally {
        setIsInitialLoad(false);
      }
    };
    loadData();
  }, []);

  // Manual Status Scanning
  const handleScanStatus = useCallback(async () => {
    const activeCameras = cameras.filter(c => !c.deleted);
    if (activeCameras.length === 0 || isScanning) return;

    setIsScanning(true);
    setCameras(prev => prev.map(c => !c.deleted ? { ...c, isChecking: true } : c));

    for (const cam of activeCameras) {
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
      setCameras(prev => prev.map(c => {
        if (c.id === cam.id) {
          const shouldToggle = Math.random() > 0.95;
          const newStatus = shouldToggle 
            ? (c.status === CameraStatus.ONLINE ? CameraStatus.OFFLINE : CameraStatus.ONLINE)
            : c.status;
          return { ...c, status: newStatus, isChecking: false, lastCheckAt: Date.now(), updatedAt: Date.now() };
        }
        return c;
      }));
    }
    setIsScanning(false);
  }, [cameras, isScanning]);

  const saveCameras = useCallback((updated: Camera[]) => {
    setCameras(updated);
    localStorage.setItem(STORAGE_KEYS.CAMERAS, JSON.stringify(updated.map(c => ({...c, isChecking: false}))));
  }, []);

  const handleSync = async () => {
    if (!ghSettings.token || !ghSettings.gistId) {
      alert('Vui lòng cấu hình GitHub Token và Gist ID trong cài đặt.');
      setShowSettingsModal(true);
      return;
    }
    setIsSyncing(true);
    try {
      const merged = await syncCamerasWithGitHub(ghSettings, cameras);
      saveCameras(merged);
      alert('Đồng bộ dữ liệu thành công!');
    } catch (err: any) {
      alert(`Lỗi đồng bộ: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredCameras = useMemo(() => {
    return cameras.filter(c => {
      if (c.deleted) return false;
      const term = searchTerm.toLowerCase();
      const matchesSearch = c.name.toLowerCase().includes(term) || c.address.toLowerCase().includes(term) || c.ip.includes(term);
      const matchesFilter = filterStatus === 'all' || c.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [cameras, searchTerm, filterStatus]);

  const stats = useMemo(() => {
    const active = cameras.filter(c => !c.deleted);
    return {
      total: active.length,
      online: active.filter(c => c.status === CameraStatus.ONLINE).length,
      offline: active.filter(c => c.status === CameraStatus.OFFLINE).length,
    };
  }, [cameras]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    const newCam: Camera = {
      id: `cam_${Date.now()}`,
      name: `Camera #${cameras.filter(c => !c.deleted).length + 1}`,
      ip: '192.168.1.xxx',
      address: `Ghim tại: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lat,
      lng,
      status: CameraStatus.ONLINE,
      updatedAt: Date.now(),
      lastCheckAt: Date.now()
    };
    setSelectedCamera(newCam);
    setShowEditModal(true);
    setIsPinMode(false);
  }, [cameras]);

  const handleSaveCamera = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCamera) return;
    const exists = cameras.find(c => c.id === selectedCamera.id);
    let updated: Camera[];
    if (exists) {
      updated = cameras.map(c => c.id === selectedCamera.id ? { ...selectedCamera, updatedAt: Date.now() } : c);
    } else {
      updated = [...cameras, { ...selectedCamera, updatedAt: Date.now(), lastCheckAt: Date.now() }];
    }
    saveCameras(updated);
    setShowEditModal(false);
    setSelectedCamera(null);
  };

  if (isInitialLoad) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-[5000]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-[3px] border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-5 text-slate-400 font-bold uppercase tracking-widest text-[10px]">Đang kết nối hệ thống...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-screen ${viewMode === 'multiview' ? 'bg-[#0f1117]' : 'bg-slate-50'} transition-all duration-300`}>
      <header className={`glass-effect sticky top-0 z-[1001] border-b ${viewMode === 'multiview' ? 'border-white/5 !bg-black/70' : 'border-slate-100'} px-4 py-3 sm:px-6 safe-top`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 sm:p-2.5 rounded-2xl text-white shadow-xl shadow-indigo-600/20">
              <i className="bi bi-camera-reels-fill text-lg"></i>
            </div>
            <div>
              <h1 className={`font-black tracking-tighter ${viewMode === 'multiview' ? 'text-white' : 'text-slate-900'} text-[11px] sm:text-sm md:text-base leading-none uppercase`}>Security Center</h1>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 inline-block">Lâm Viên • Đà Lạt</span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <button 
              onClick={() => setViewMode(viewMode === 'dashboard' ? 'multiview' : 'dashboard')}
              className={`flex items-center px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black transition-all active:scale-95 ${
                viewMode === 'multiview' 
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' 
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm'
              }`}
            >
              <i className={`bi ${viewMode === 'multiview' ? 'bi-speedometer2' : 'bi-grid-3x3-gap-fill'} mr-1.5`}></i>
              <span className="hidden xs:inline">{viewMode === 'multiview' ? 'Dashboard' : 'Xem Lưới'}</span>
              <span className="xs:hidden">{viewMode === 'multiview' ? 'Dash' : 'Grid'}</span>
            </button>
            
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className={`flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 bg-indigo-600 text-white rounded-xl sm:rounded-2xl text-[11px] font-black hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50`}
            >
              <i className={`bi ${isSyncing ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-arrow-up-fill'} text-base sm:mr-2`}></i>
              <span className="hidden md:inline">Đồng Bộ Cloud</span>
            </button>

            <button onClick={() => setShowSettingsModal(true)} className={`p-2.5 ${viewMode === 'multiview' ? 'text-slate-400 border-white/10 hover:bg-white/5' : 'text-slate-400 border-slate-100 hover:bg-white shadow-sm'} rounded-xl sm:rounded-2xl border transition-all active:scale-90`}>
              <i className="bi bi-gear-fill text-base"></i>
            </button>
          </div>
        </div>
      </header>

      {viewMode === 'dashboard' ? (
        <main className="flex-1 container mx-auto p-4 lg:p-8 space-y-6 max-w-7xl animate-in fade-in duration-500">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
            <div className="col-span-2 md:col-span-1">
              <StatsCard label="Thiết bị" value={stats.total} icon="bi-cpu" colorClass="text-indigo-600 border-indigo-50" />
            </div>
            <StatsCard label="Online" value={stats.online} icon="bi-broadcast" colorClass="text-green-600 border-green-50" />
            <StatsCard label="Offline" value={stats.offline} icon="bi-wifi-off" colorClass="text-red-600 border-red-50" />
          </div>

          <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden h-[400px] md:h-[500px] relative group">
            <div className="absolute top-4 right-4 z-[1000] flex flex-col space-y-2">
              <button onClick={() => setIsPinMode(!isPinMode)} className={`p-3.5 rounded-2xl shadow-2xl border transition-all ${isPinMode ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/30' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                <i className={`bi ${isPinMode ? 'bi-pin-map-fill' : 'bi-pin-map'} text-lg`}></i>
              </button>
              <button 
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(p => setFocusedCamera({ id: `LOC_${Date.now()}`, name: 'Vị trí của bạn', lat: p.coords.latitude, lng: p.coords.longitude, status: CameraStatus.ONLINE } as any));
                  }
                }} 
                className="p-3.5 bg-white text-slate-700 rounded-2xl shadow-2xl border border-slate-200"
              >
                <i className="bi bi-crosshair text-lg"></i>
              </button>
            </div>
            <CameraMap cameras={filteredCameras} isPinMode={isPinMode} onMapClick={handleMapClick} onViewLive={(id) => { const cam = cameras.find(c => c.id === id); if (cam) { setSelectedCamera(cam); setShowVideoModal(true); }}} focusedCamera={focusedCamera} />
          </section>

          <section className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
              <div className="flex-1 flex gap-2">
                <div className="flex-1 relative">
                  <i className="bi bi-search absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm camera hoặc IP..." 
                    className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all shadow-sm text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={handleScanStatus}
                  disabled={isScanning}
                  className={`p-4 bg-white border border-slate-100 rounded-2xl shadow-sm text-slate-600 hover:text-indigo-600 transition-all ${isScanning ? 'opacity-50' : 'active:scale-95'}`}
                  title="Cập nhật trạng thái"
                >
                  <i className={`bi ${isScanning ? 'bi-arrow-repeat animate-spin' : 'bi-arrow-clockwise'} text-lg`}></i>
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <select 
                  className="bg-white border border-slate-100 rounded-2xl px-4 py-4 text-xs font-bold text-slate-600 outline-none flex-1 md:flex-none"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                >
                  <option value="all">Tất cả</option>
                  <option value={CameraStatus.ONLINE}>Online</option>
                  <option value={CameraStatus.OFFLINE}>Offline</option>
                </select>
                <button 
                  onClick={() => { setSelectedCamera({ id: `cam_${Date.now()}`, name: '', ip: '192.168.1.xxx', address: '', lat: 11.9404, lng: 108.4583, status: CameraStatus.ONLINE, updatedAt: Date.now() }); setShowEditModal(true); }}
                  className="bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-600/20 text-[10px] uppercase tracking-widest"
                >
                  Thêm Camera
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
              <CameraTable 
                cameras={filteredCameras} 
                onEdit={(cam) => { setSelectedCamera(cam); setShowEditModal(true); }} 
                onDelete={(id) => setCameras(prev => prev.map(c => c.id === id ? {...c, deleted: true} : c))} 
                onFocus={setFocusedCamera} 
              />
            </div>
          </section>
        </main>
      ) : (
        <main className="flex-1 p-4 lg:p-10 overflow-y-auto custom-scrollbar animate-in zoom-in-98 duration-500">
          <div className="max-w-[1700px] mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center justify-between w-full md:w-auto">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-4 shadow-[0_0_15px_#ef4444]"></div>
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">Hệ Thống Trực Tuyến</h2>
                </div>
                {/* Nút Sync bổ sung cho mobile trong chế độ xem lưới */}
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="md:hidden flex items-center justify-center p-2.5 bg-white/10 text-white rounded-xl active:scale-95 transition-all"
                >
                  <i className={`bi ${isSyncing ? 'bi-arrow-repeat animate-spin' : 'bi-cloud-arrow-up-fill'}`}></i>
                </button>
              </div>
              
              <div className="relative w-full md:w-96">
                <i className="bi bi-geo-alt-fill absolute left-5 top-1/2 -translate-y-1/2 text-slate-500"></i>
                <input 
                  type="text" 
                  placeholder="Lọc địa chỉ hoặc tên camera..." 
                  className="w-full pl-12 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white text-sm outline-none focus:bg-white/10 focus:border-white/20 transition-all shadow-2xl"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {filteredCameras.filter(c => c.status === CameraStatus.ONLINE).slice(0, 15).map((cam) => (
                <div 
                  key={cam.id} 
                  className="bg-[#1a1e26] rounded-3xl overflow-hidden border border-white/5 shadow-2xl aspect-video relative group transition-all hover:scale-[1.03] cursor-pointer"
                  onClick={() => { setSelectedCamera(cam); setShowVideoModal(true); }}
                >
                  {cam.videoUrl ? (
                    <iframe className="w-full h-full pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" src={cam.videoUrl.includes('youtube.com') ? cam.videoUrl.replace('watch?v=', 'embed/') + '?autoplay=1&mute=1&controls=0' : cam.videoUrl} title={cam.name}></iframe>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-800">
                      <i className="bi bi-camera-video-off text-5xl mb-3 opacity-10"></i>
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-20">No Signal</p>
                    </div>
                  )}
                  <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent">
                    <div className="flex justify-between items-start">
                      <div className="max-w-[80%]">
                        <h4 className="text-white font-bold text-[11px] uppercase tracking-tight truncate leading-tight">{cam.name}</h4>
                        <span className="text-[9px] font-mono text-indigo-400 font-bold mt-1 inline-block">{cam.ip}</span>
                      </div>
                      <div className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg shadow-red-500/20 animate-pulse">LIVE</div>
                    </div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white/60 text-[9px] truncate"><i className="bi bi-geo-alt mr-1"></i>{cam.address}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[2000] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center tracking-tight">
              <i className="bi bi-cloud-check-fill text-indigo-600 mr-3"></i>
              Cloud Backup
            </h3>
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">GitHub Token</label>
                <input 
                  type="password" 
                  placeholder="ghp_..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4.5 text-sm font-mono focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" 
                  value={ghSettings.token} 
                  onChange={(e) => setGhSettings(prev => ({ ...prev, token: e.target.value }))} 
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">Gist ID</label>
                <input 
                  type="text" 
                  placeholder="ID Gist của bạn"
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4.5 text-sm font-mono focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all" 
                  value={ghSettings.gistId} 
                  onChange={(e) => setGhSettings(prev => ({ ...prev, gistId: e.target.value }))} 
                />
              </div>
              <div className="pt-8 flex gap-3">
                <button 
                  onClick={() => { localStorage.setItem(STORAGE_KEYS.GITHUB_SETTINGS, JSON.stringify(ghSettings)); setShowSettingsModal(false); }} 
                  className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black text-sm uppercase shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  Lưu & Áp Dụng
                </button>
                <button onClick={() => setShowSettingsModal(false)} className="px-8 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm uppercase">Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {showEditModal && selectedCamera && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[2000] flex items-center justify-center p-4">
          <form onSubmit={handleSaveCamera} className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 sm:p-10 shadow-2xl animate-in slide-in-from-bottom-8">
            <h3 className="text-2xl font-black text-slate-900 mb-8 tracking-tight uppercase">Thông Tin Camera</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tên camera</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm font-bold outline-none" value={selectedCamera.name} onChange={(e) => setSelectedCamera({ ...selectedCamera, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Địa chỉ IP</label>
                <input required type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm font-mono font-bold text-indigo-600 outline-none" value={selectedCamera.ip} onChange={(e) => setSelectedCamera({ ...selectedCamera, ip: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Trạng thái</label>
                <select className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm font-bold outline-none" value={selectedCamera.status} onChange={(e) => setSelectedCamera({ ...selectedCamera, status: e.target.value as CameraStatus })}>
                  <option value={CameraStatus.ONLINE}>ONLINE</option>
                  <option value={CameraStatus.OFFLINE}>OFFLINE</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Vị trí</label>
                <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm" value={selectedCamera.address} onChange={(e) => setSelectedCamera({ ...selectedCamera, address: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Link Video</label>
                <input type="text" placeholder="Link YouTube/Stream" className="w-full bg-slate-50 border border-slate-100 rounded-xl px-5 py-4 text-sm" value={selectedCamera.videoUrl || ''} onChange={(e) => setSelectedCamera({ ...selectedCamera, videoUrl: e.target.value })} />
              </div>
            </div>
            <div className="pt-10 flex gap-3">
              <button type="submit" className="flex-1 bg-indigo-600 text-white py-5 rounded-2xl font-black text-sm uppercase shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Lưu Thiết Bị</button>
              <button type="button" onClick={() => setShowEditModal(false)} className="px-8 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm uppercase">Hủy</button>
            </div>
          </form>
        </div>
      )}

      {/* Video Modal Player */}
      {showVideoModal && selectedCamera && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[4000] flex items-center justify-center p-4">
          <div className="bg-[#141820] rounded-[2rem] w-full max-w-5xl overflow-hidden shadow-2xl border border-white/5 animate-in zoom-in-95">
            <div className="p-5 flex items-center justify-between border-b border-white/5 bg-black/40">
              <div className="flex items-center space-x-4">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <div>
                  <h4 className="font-black text-white text-sm sm:text-base uppercase tracking-tight truncate leading-none">{selectedCamera.name}</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1.5 leading-none">IP: {selectedCamera.ip} • 30 FPS</p>
                </div>
              </div>
              <button onClick={() => setShowVideoModal(false)} className="bg-white/5 hover:bg-white/10 text-white w-10 h-10 rounded-2xl flex items-center justify-center active:scale-90 transition-all"><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center relative">
              {selectedCamera.videoUrl ? (
                <iframe className="w-full h-full border-none" src={selectedCamera.videoUrl.includes('youtube.com') ? selectedCamera.videoUrl.replace('watch?v=', 'embed/') + '?autoplay=1&mute=0' : selectedCamera.videoUrl} title="Live Stream" allowFullScreen></iframe>
              ) : (
                <div className="text-center p-10 flex flex-col items-center">
                  <i className="bi bi-broadcast-pin text-6xl text-slate-800 mb-6"></i>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-sm text-center">Offline - {selectedCamera.ip}</p>
                </div>
              )}
            </div>
            <div className="p-4 bg-black/40 text-[10px] text-slate-500 font-medium italic">
              <i className="bi bi-geo-alt-fill mr-1 text-indigo-500"></i> {selectedCamera.address}
            </div>
          </div>
        </div>
      )}

      <footer className={`mt-auto py-10 text-center transition-colors ${viewMode === 'multiview' ? 'text-slate-700' : 'text-slate-400'}`}>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] px-4 opacity-80 italic">Hệ Thống An Ninh • Lâm Viên Surveillance • © 2025</p>
      </footer>
    </div>
  );
};

export default App;
