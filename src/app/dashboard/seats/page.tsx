'use client'
import { useState, useEffect, useRef } from "react";
import { Grip, Plus, Trash2, Save, Undo2, Loader2, Lock, X } from "lucide-react";
import { saveSeatLayoutAndLockers, getSeatLayoutAndLockers } from "@/app/actions/seat-actions";
import LiveSeatMap from "@/components/LiveSeatMap";
import { useRealtimeSeats } from "@/hooks/useRealtimeSeats";
import { formatStandardDate } from "@/lib/date-utils";
export default function SeatsManagerPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(8);
  const [seatNaming, setSeatNaming] = useState<'ALPHANUMERIC' | 'NUMERIC'>('ALPHANUMERIC');
  
  const [seats, setSeats] = useState<any[]>([]);
  const [standaloneLockers, setStandaloneLockers] = useState<any[]>([]);
  
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

  const [previewMode, setPreviewMode] = useState(false);
  const [popupSeatId, setPopupSeatId] = useState<string | null>(null);
  const [popupData, setPopupData] = useState<any>(null);
  const [isPopupLoading, setIsPopupLoading] = useState(false);
  const [libraryId, setLibraryId] = useState<string>("");
  const [initialOccupied, setInitialOccupied] = useState<string[]>([]);
  const realtimeOccupiedSeatIds = useRealtimeSeats(libraryId, initialOccupied);

  const scrollRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walkX = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walkX;
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (scrollRef.current && !isDragging) {
      scrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleMainScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (topScrollRef.current && !isDragging) {
      topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handlePreviewSeatClick = async (seat: any) => {
    if (!realtimeOccupiedSeatIds.includes(seat.id)) return; // Only fetch if occupied

    setPopupSeatId(seat.id);
    setIsPopupLoading(true);
    setPopupData(null);

    try {
      const res = await fetch(`/api/library/seat-details?libraryId=${libraryId}&seatId=${seat.id}`);
      if (res.ok) {
        const data = await res.json();
        setPopupData(data.booking);
      } else {
        setPopupData(null);
      }
    } catch (e) {
      console.error(e);
      setPopupData(null);
    } finally {
      setIsPopupLoading(false);
    }
  };

  useEffect(() => {
    async function load() {
      try {
        const data = await getSeatLayoutAndLockers();
        if (data.libraryId) {
          setLibraryId(data.libraryId);
          // Fetch initial occupied seats
          const res = await fetch(`/api/student/live-seats?libraryId=${data.libraryId}`);
          if (res.ok) {
            const liveData = await res.json();
            setInitialOccupied(liveData.occupiedSeatIds || []);
          }
          if ((data as any).seatNaming) {
            setSeatNaming((data as any).seatNaming);
          }
        }
      
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
      const currentNaming = data.libraryId ? ((data as any).seatNaming || 'ALPHANUMERIC') : 'ALPHANUMERIC';
      for (let i = 0; i < finalRows * finalCols; i++) {
        const x = i % finalCols;
        const y = Math.floor(i / finalCols);
        const id = currentNaming === 'NUMERIC' ? ((y * finalCols) + x + 1).toString() : `${String.fromCharCode(65 + y)}${x + 1}`;
        
        const existing = data.seats.find(s => s.x === x && s.y === y);
        if (existing) {
          grid.push({ ...existing, id }); // ensure id matches coords
        } else {
          grid.push({ id, x, y, type: isEmptyLibrary ? 'NORMAL' : 'EMPTY', hasLocker: false, lockerPriceMonthly: "" });
        }
      }
      
      setSeats(grid);
      const lockers = data.standaloneLockers || [];
      // Assuming lockers have createdAt or we just reverse to put newer at top
      setStandaloneLockers(lockers.reverse());
      } catch (e) {
        console.error("Failed to load seats", e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Sync grid when rows/cols/naming change manually (adds/removes empty cells and recomputes IDs)
  useEffect(() => {
    if (isLoading) return;
    
    setSeats(prev => {
      const newGrid: any[] = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const id = seatNaming === 'NUMERIC' ? ((y * cols) + x + 1).toString() : `${String.fromCharCode(65 + y)}${x + 1}`;
          const existing = prev.find(s => s.x === x && s.y === y);
          if (existing) {
            // Always update the ID to the newly computed one to instantly reflect format changes 
            // and prevent duplicates when cols change.
            newGrid.push({ ...existing, id });
          } else {
            newGrid.push({ id, x, y, type: 'NORMAL', hasLocker: false, lockerPriceMonthly: "" });
          }
        }
      }
      return newGrid;
    });
  }, [rows, cols, isLoading, seatNaming]);

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
          const id = seatNaming === 'NUMERIC' ? ((y * cols) + x + 1).toString() : `${String.fromCharCode(65 + y)}${x + 1}`;
          return { id, x, y, type: 'NORMAL', hasLocker: false, lockerPriceMonthly: "" };
        })
      );
      setSelectedSeatId(null);
    }
  };

  const addStandaloneLocker = () => {
    setStandaloneLockers([{ id: Date.now().toString(), name: `L${standaloneLockers.length + 1}`, price: "" }, ...standaloneLockers]);
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
      await saveSeatLayoutAndLockers(seats, standaloneLockers, true, seatNaming);
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
        <div className="flex gap-2 items-center">
          <select 
            value={seatNaming}
            onChange={(e) => setSeatNaming(e.target.value as any)}
            className="bg-card text-foreground border border-border font-semibold px-4 py-2 rounded-lg text-sm hover:bg-muted transition-colors outline-none cursor-pointer"
          >
            <option value="ALPHANUMERIC">Alphanumeric (A1, B2)</option>
            <option value="NUMERIC">Numeric (1, 2, 3)</option>
          </select>
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
        <div className="lg:col-span-1 space-y-6 sticky top-24 self-start">
          
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
                    <option value="NORMAL">Reservable (General)</option>
                    <option value="PREMIUM">Premium Seat</option>
                    <option value="NON_RESERVABLE">Non-Reservable (Wall/Path)</option>
                    <option value="EMPTY">Empty Space (Hidden)</option>
                  </select>
                </div>

                {selectedSeat.type === 'PREMIUM' && (
                  <div className="space-y-4 pt-4 border-t border-border">
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-amber-600 flex items-center gap-2">
                        Premium Price (Monthly ₹)
                      </label>
                      <input 
                        type="number" 
                        value={selectedSeat.premiumPriceMonthly || ''} 
                        onChange={(e) => updateSelectedSeat('premiumPriceMonthly', e.target.value)}
                        placeholder="e.g. 300"
                        className="w-full p-2.5 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-amber-500 text-sm"
                      />
                    </div>
                    
                    <label className="flex items-center gap-2 text-sm font-bold text-foreground cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={selectedSeat.syncPremiumOffers !== false} 
                        onChange={(e) => updateSelectedSeat('syncPremiumOffers', e.target.checked)} 
                        className="rounded text-amber-500 focus:ring-amber-500 accent-amber-500 w-4 h-4" 
                      />
                      Sync Offers with Plans
                    </label>
                  </div>
                )}

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
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm max-w-full min-h-[500px]">
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

            {/* Top Scrollbar */}
            <div 
              ref={topScrollRef} 
              onScroll={handleMainScroll}
              className="w-full overflow-x-auto overflow-y-hidden mb-2 custom-scrollbar"
            >
              <div style={{ width: `${cols * 68 + 64}px`, height: '1px' }}></div>
            </div>

            <div 
              ref={scrollRef}
              onScroll={handleTopScroll}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
              className={`w-full overflow-x-auto overflow-y-auto custom-scrollbar ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
              <div className="w-max flex flex-col gap-3 p-8 bg-muted/20 border border-border/50 rounded-xl relative select-none">
              {Array.from({ length: rows }).map((_, y) => (
                <div key={y} className="flex gap-3 relative">
                  {seats.filter(s => s.y === y && s.x < cols).map(seat => {
                    let bgClass = "bg-background border-border hover:border-primary shadow-sm";
                    let textClass = "text-foreground";
                    
                    if (seat.type === 'RESERVED') {
                      bgClass = "bg-muted border-border/50 opacity-80";
                      textClass = "text-muted-foreground";
                    } else if (seat.type === 'PREMIUM') {
                      bgClass = "bg-amber-50 border-amber-400 border-2 hover:border-amber-500 shadow-sm";
                      textClass = "text-amber-700";
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
            </div>
            
            <div className="mt-8 mx-auto max-w-sm text-center py-3 bg-muted rounded-xl text-muted-foreground text-sm tracking-widest uppercase font-bold border border-border shadow-sm">
              Front Desk / Entrance
            </div>
          </div>

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
            <div className="p-6 overflow-y-auto bg-muted/10 relative">
              <LiveSeatMap 
                library={{ seats: seats.map(s => ({ ...s, gridX: s.x, gridY: s.y, name: s.id })) }} 
                occupiedSeatIds={realtimeOccupiedSeatIds} 
                compactMode={true}
                interactive={true}
                adminMode={true}
                onSeatSelect={handlePreviewSeatClick}
              />

              {popupSeatId && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card border border-border shadow-2xl rounded-2xl p-6 min-w-[300px] animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-foreground">Seat {popupSeatId}</h3>
                    <button onClick={() => setPopupSeatId(null)} className="p-1 hover:bg-muted rounded-full">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  
                  {isPopupLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : popupData ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 bg-muted/50 p-3 rounded-xl border border-border/50">
                        {popupData.student.profilePhotoUrl ? (
                          <img src={popupData.student.profilePhotoUrl} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                            {popupData.student.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm text-foreground">{popupData.student.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{popupData.student.phone}</p>
                        </div>
                      </div>
                      <div className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">Plan:</span> {popupData.plan?.name || "Custom"}</p>
                        <p><span className="text-muted-foreground">Valid Until:</span> {formatStandardDate(popupData.endTime)} {new Date(popupData.endTime).toLocaleTimeString()}</p>
                      </div>
                      <a 
                        href={`/dashboard/students/${popupData.student.id}`} 
                        className="block w-full text-center py-2 bg-primary text-primary-foreground text-sm font-semibold rounded-lg hover:opacity-90 transition-opacity"
                        target="_blank"
                      >
                        View Profile
                      </a>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground py-4">
                      Seat is currently vacant.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
