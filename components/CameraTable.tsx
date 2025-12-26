
import React from 'react';
import { Camera, CameraStatus } from '../types';

interface CameraTableProps {
  cameras: Camera[];
  onEdit: (cam: Camera) => void;
  onDelete: (id: string) => void;
  onFocus: (cam: Camera) => void;
}

const CameraTable: React.FC<CameraTableProps> = ({ cameras, onEdit, onDelete, onFocus }) => {
  const formatTime = (ts?: number) => {
    if (!ts) return 'N/A';
    return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="overflow-x-auto custom-scrollbar">
      <table className="min-w-full divide-y divide-slate-100 bg-white text-sm">
        <thead className="bg-slate-50/80 sticky top-0 z-10">
          <tr>
            <th className="px-6 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[9px]">Thiết bị</th>
            <th className="px-6 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[9px]">Địa chỉ IP</th>
            <th className="px-6 py-5 text-center font-bold text-slate-400 uppercase tracking-widest text-[9px]">Trạng thái</th>
            <th className="px-6 py-5 text-left font-bold text-slate-400 uppercase tracking-widest text-[9px] hidden lg:table-cell">Cập nhật</th>
            <th className="px-6 py-5 text-right font-bold text-slate-400 uppercase tracking-widest text-[9px]">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {cameras.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-6 py-16 text-center text-slate-400 italic font-medium">
                Dữ liệu trống - Vui lòng thêm camera hoặc đồng bộ cloud
              </td>
            </tr>
          ) : (
            cameras.map((cam) => (
              <tr 
                key={cam.id} 
                className="hover:bg-indigo-50/40 transition-all cursor-pointer group"
                onClick={() => onFocus(cam)}
              >
                <td className="px-6 py-5">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-[13px]">{cam.name}</span>
                    <span className="text-[11px] text-slate-400 truncate max-w-[150px] sm:max-w-[200px] mt-1 font-medium italic">{cam.address}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-50 text-indigo-600 font-mono text-[11px] font-bold border border-slate-200 group-hover:bg-white group-hover:border-indigo-200 transition-all">
                    {cam.ip}
                  </span>
                </td>
                <td className="px-6 py-5 text-center">
                  {cam.isChecking ? (
                    <div className="flex items-center justify-center text-slate-300">
                      <i className="bi bi-arrow-repeat animate-spin text-sm"></i>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tight ${
                        cam.status === CameraStatus.ONLINE 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          cam.status === CameraStatus.ONLINE ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500'
                        }`}></span>
                        {cam.status === CameraStatus.ONLINE ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-5 text-slate-400 hidden lg:table-cell text-[11px] font-medium">
                  {formatTime(cam.lastCheckAt)}
                </td>
                <td className="px-6 py-5 text-right space-x-1 whitespace-nowrap">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(cam); }}
                    className="p-2.5 text-slate-400 hover:bg-indigo-600 hover:text-white rounded-xl transition-all inline-flex"
                    title="Cấu hình"
                  >
                    <i className="bi bi-pencil-square"></i>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(cam.id); }}
                    className="p-2.5 text-slate-400 hover:bg-red-500 hover:text-white rounded-xl transition-all inline-flex"
                    title="Xóa"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default CameraTable;
