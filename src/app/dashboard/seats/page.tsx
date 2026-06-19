'use client'
import { useState, useEffect } from "react";
import { Grip, Plus, Trash2, Save, Undo2, Loader2, Lock, X } from "lucide-react";
import { saveSeatLayoutAndLockers, getSeatLayoutAndLockers } from "@/app/actions/seat-actions";
import LiveSeatMap from "@/components/LiveSeatMap";

export default function SeatsManagerPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(8);
  
  const [seats, setSeats] = useState<any[]>([]);
  const [standaloneLockers, setStandaloneLockers] = useState<any[]>([]);
  
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    async function load() {
      const data = await getSeatLayoutAndLockers();
      
      let finalRows = 5;
      let finalCols = 8;
      
      // Calculate dimensions from existing seats if any
      if (data.seats && data.seats.length > 0) {
        const maxR = Math.max(...data.seats.map(s => s.y)) + 1;
        const maxC = Math.max(...data.seats.map(s => s.x)) + 1;
        finalRows = Math.max(5, maxR);
        finalCols = Math.max(8, maxC);
        setRows(finalRows);
        setCols(finalCols);
      }



      const isEmptyLibrary = !data.seats || data.seats.length === 0;

      // Initialize grid, filling in gaps with EMPTY
      const grid: any[] = [];
      for (let i = 0; i < finalRows * finalCols; i++) {
        const x = i % finalCols;
        const y = Math.floor(i / finalCols);
        const id = `${String.fromCharCode(65 + y)}${x + 1}`;
        
        const existing = data.seats.find(s => s.x === x && s.y === y);
        if (existing) {
          grid.push({ ...existing, id }); // ensure id matches coords
        } else {
          grid.push({ id, x, y, type: isEmptyLibrary ? 'NORMAL' : 'EMPTY', hasLocker: false, lockerPriceMonthly: "" });
        }
      }
      
      setSeats(grid);
      setStandaloneLockers(data.standaloneLockers || []);
      setIsLoading(false);
    }
    load();
  }, []);

  // Sync grid when rows/cols change manually (adds/removes empty cells)
  useEffect(() => {
    if (isLoading) return;
    
    setSeats(prev => {
      const newGrid: any[] = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const id = `${String.fromCharCode(65 + y)}${x + 1}`;
          const existing = prev.find(s => s.x === x && s.y === y);
          if (existing) {
            newGrid.push(existing);
          } else {
            newGrid.push({ id, x, y, type: 'NORMAL', hasLocker: false, lockerPriceMonthly: "" });
          }
        }
      }
      return newGrid;
    });
  }, [rows, cols, isLoading]);

  const handleSeatClick = (id: string) => {
    setSelectedSeatId(id);
  };

  const updateSelectedSeat = (field: string, value: any) => {
    if (!selectedSeatId) return;
    setSeats(seats.map(s => s.id === selectedSeatId ? { ...s, [field]: value } : s));
  };

  const handleReset = () => {
    if (confirm("Are you sure you want to reset the entire grid? All seats will become NORMAL and lockers will be cleared.")) {
      setSeats(
        Array.from({ length: rows * cols }, (_, i) => {
          const x = i % cols;
          const y = Math.floor(i / cols);
          const id = `${String.fromCharCode(65 + y)}${x + 1}`;
          return { id, x, y, type: 'NORMAL', hasLocker: false, lockerPriceMonthly: "" };
        })
      );
      setSelectedSeatId(null);
    }
  };

  const addStandaloneLocker = () => {
    setStandaloneLockers([...standaloneLockers, { id: Date.now().toString(), name: `L${standaloneLockers.length + 1}`, price: "" }]);
  };

  const updateStandaloneLocker = (id: string, field: string, value: any) => {
    setStandaloneLockers(standaloneLockers.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const removeStandaloneLocker = (id: string) => {
    setStandaloneLockers(standaloneLockers.filter(l => l.id !== id));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSeatLayoutAndLockers(seats, standaloneLockers, true);
      alert("Layout & Lockers saved successfully!");
    } catch (e) {
      alert("Failed to save layout.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  const selectedSeat = seats.find(s => s.id === selectedSeatId);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Seat Plan & Lockers</h1>
          <p className="text-muted-foreground mt-1">Design your library layout and manage locker pricing.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReset} className="bg-card text-foreground border border-border font-semibold px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors flex items-center gap-2">
            <Undo2 className="w-4 h-4" /> Reset Grid
          </button>
          <button onClick={handleSave} disabled={isSaving} className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
            {isSaving ? 'Saving...' : 'Save Layout & Lockers'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Seat Properties Panel */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h2 className="font-bold text-foreground mb-4">Selected Seat</h2>
            
            {selectedSeat ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted rounded-xl">
                  <span className="font-bold text-lg">{selectedSeat.id}</span>
                  <span className="text-xs font-bold px-2 py-1 bg-background rounded text-muted-foreground">Col {selectedSeat.x + 1}, Row {String.fromCharCode(65 + selectedSeat.y)}</span>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground block">Seat Type</label>
                  <select 
                    value={selectedSeat.type} 
                    onChange={(e) => updateSelectedSeat('type', e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  >
                    <option value="NORMAL">Reservable</option>
                    <option value="NON_RESERVABLE">Non-Reservable (Wall/Path)</option>
                    <option value="EMPTY">Empty Space (Hidden)</option>
                  </select>
                </div>

                {selectedSeat.type !== 'EMPTY' && selectedSeat.type !== 'NON_RESERVABLE' && (
                  <div className="space-y-3 pt-4 border-t border-border">
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedSeat.hasLocker} 
                        onChange={(e) => updateSelectedSeat('hasLocker', e.target.checked)} 
                        className="rounded text-primary focus:ring-primary accent-primary w-4 h-4" 
                      />
                      Seat has Attached Locker
                    </label>

                    {selectedSeat.hasLocker && (
                      <div className="pl-6 space-y-1">
                        <label className="text-xs font-medium text-muted-foreground block">Monthly Locker Price (₹)</label>
                        <input 
                          type="number" 
                          value={selectedSeat.lockerPriceMonthly} 
                          onChange={(e) => updateSelectedSeat('lockerPriceMonthly', e.target.value)}
                          placeholder="e.g. 100"
                          className="w-full p-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8 bg-muted/30 border border-dashed border-border rounded-xl">
                Click a seat on the grid to edit its properties.
              </div>
            )}
          </div>

          {/* Grid Dimensions Panel */}
          <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
            <h2 className="font-bold text-foreground mb-4">Grid Dimensions</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Rows (A-Z)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setRows(Math.max(1, rows - 1))} className="p-2 border border-border rounded-lg hover:bg-muted">-</button>
                  <input type="number" value={rows} readOnly className="w-full text-center px-4 py-2 rounded-lg border border-border bg-input/50" />
                  <button onClick={() => setRows(Math.min(26, rows + 1))} className="p-2 border border-border rounded-lg hover:bg-muted">+</button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Columns (1-50)</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCols(Math.max(1, cols - 1))} className="p-2 border border-border rounded-lg hover:bg-muted">-</button>
                  <input type="number" value={cols} readOnly className="w-full text-center px-4 py-2 rounded-lg border border-border bg-input/50" />
                  <button onClick={() => setCols(Math.min(50, cols + 1))} className="p-2 border border-border rounded-lg hover:bg-muted">+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm overflow-auto min-h-[500px]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <h2 className="font-bold text-foreground">Interactive Seat Grid</h2>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setPreviewMode(true)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors bg-muted border-border text-muted-foreground hover:bg-muted/80`}
                >
                  Preview Student View
                </button>
                <div className="flex gap-4 text-xs font-medium text-muted-foreground">
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm border border-border bg-background"></div> Normal</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm border border-border bg-muted"></div> Reserved</span>
                  <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-sm border border-border bg-destructive/5 border-dashed border-destructive/50"></div> Non-Res</span>
                  <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> Has Locker</span>
                </div>
              </div>
            </div>
            
            <div className="w-max flex flex-col gap-3 mt-4 p-8 bg-muted/20 border border-border/50 rounded-xl relative">
              {Array.from({ length: rows }).map((_, y) => (
                <div key={y} className="flex gap-3 relative">
                  {seats.filter(s => s.y === y && s.x < cols).map(seat => {
                    let bgClass = "bg-background border-border hover:border-primary shadow-sm";
                    let textClass = "text-foreground";
                    
                    if (seat.type === 'RESERVED') {
                      bgClass = "bg-muted border-border/50 opacity-80";
                      textClass = "text-muted-foreground";
                    } else if (seat.type === 'NON_RESERVABLE') {
                      bgClass = "bg-destructive/5 border-destructive/50 border-dashed";
                      textClass = "text-destructive";
                    } else if (seat.type === 'EMPTY') {
                      bgClass = "bg-transparent border-dashed border-border/50 opacity-30 hover:opacity-100 hover:border-primary";
                      textClass = "text-transparent hover:text-muted-foreground";
                    }

                    const isSelected = selectedSeatId === seat.id;
                    if (isSelected) {
                      bgClass += " ring-4 ring-primary/20 border-primary";
                    }

                    return (
                      <div 
                        key={seat.id} 
                        onClick={() => handleSeatClick(seat.id)}
                        className={`relative w-14 h-14 rounded-xl border flex items-center justify-center font-bold text-sm transition-all cursor-pointer select-none ${bgClass} ${textClass}`}
                        title={seat.id}
                      >
                        {seat.type === 'EMPTY' ? '+' : seat.id}
                        
                        {seat.hasLocker && seat.type !== 'EMPTY' && (
                          <div className="absolute -top-2 -right-2 bg-foreground text-background p-0.5 rounded-full shadow-sm">
                            <Lock className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            
            <div className="mt-8 mx-auto max-w-sm text-center py-3 bg-muted rounded-xl text-muted-foreground text-sm tracking-widest uppercase font-bold border border-border shadow-sm">
              Front Desk / Entrance
            </div>
          </div>

          {/* Standalone Lockers Manager */}
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="font-bold text-foreground text-xl">Standalone Lockers</h2>
                <p className="text-sm text-muted-foreground">Add lockers that aren't attached to any specific seat.</p>
              </div>
              <button onClick={addStandaloneLocker} className="bg-muted text-foreground border border-border font-semibold px-4 py-2 rounded-lg text-sm hover:bg-muted/80 transition-colors flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Locker
              </button>
            </div>

            {standaloneLockers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-muted/30 border border-dashed border-border rounded-xl">
                No standalone lockers added. Students won't see an optional locker dropdown.
              </div>
            ) : (
              <div className="space-y-3">
                {standaloneLockers.map((locker, idx) => (
                  <div key={locker.id} className="flex gap-4 items-center bg-background p-3 rounded-xl border border-border">
                    <div className="font-bold text-muted-foreground w-8 text-center">{idx + 1}</div>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Locker Name/Number</label>
                      <input 
                        type="text" 
                        value={locker.name} 
                        onChange={(e) => updateStandaloneLocker(locker.id, 'name', e.target.value)}
                        placeholder="e.g. L1"
                        className="w-full p-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Monthly Price (₹)</label>
                      <input 
                        type="number" 
                        value={locker.price} 
                        onChange={(e) => updateStandaloneLocker(locker.id, 'price', e.target.value)}
                        placeholder="e.g. 50"
                        className="w-full p-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-sm font-medium"
                      />
                    </div>
                    <button onClick={() => removeStandaloneLocker(locker.id)} className="mt-5 p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
      
      {/* Preview Modal Overlay */}
      {previewMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-3xl border border-border shadow-2xl flex flex-col relative animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-foreground">Student View Preview</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This is how the seat map will look to students when they are booking a seat.
                </p>
              </div>
              <button 
                onClick={() => setPreviewMode(false)}
                className="p-3 hover:bg-muted rounded-full transition-colors flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-muted/10">
              <LiveSeatMap 
                library={{ seats: seats.map(s => ({ ...s, gridX: s.x, gridY: s.y, name: s.id })) }} 
                occupiedSeatIds={[]} 
                compactMode={true}
                interactive={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
