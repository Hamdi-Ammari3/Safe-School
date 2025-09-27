import React,{useState,useMemo,useEffect} from 'react'
import Image from 'next/image'
import { useGlobalState } from '../globalState'
import { getDocs,collection,Timestamp,writeBatch,doc,getDoc,arrayUnion,setDoc } from "firebase/firestore"
import { DB } from '../firebaseConfig'
import dayjs from "dayjs"
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import "dayjs/locale/ar"
import locale from "antd/es/date-picker/locale/ar_EG"
import ClipLoader from "react-spinners/ClipLoader"
import { Modal,DatePicker } from "antd"
import { GoogleMap,Marker,InfoWindow } from "@react-google-maps/api"
import { FaCaretUp,FaCaretDown } from "react-icons/fa6"
import { FiEdit2 } from "react-icons/fi"
import { BsArrowLeftShort } from "react-icons/bs"
import { FcCancel } from "react-icons/fc"
import { FcPlus } from "react-icons/fc"
import { IoClose } from "react-icons/io5"
import { PiCaretDoubleRightFill } from "react-icons/pi"
import { PiCaretDoubleLeftFill } from "react-icons/pi"
import { BiSolidRightArrow } from "react-icons/bi"
import { BiSolidLeftArrow } from "react-icons/bi"
import switchLine from '../images/transfer.png'

const Lines = () => {
  const { lines,drivers,riders } = useGlobalState()
  dayjs.extend(utc)
  dayjs.extend(timezone)
  const today = dayjs().tz("Asia/Baghdad").startOf("day")

  const [selectedLine, setSelectedLine] = useState(null)
  const [lineDriverNameFilter, setLineDriverNameFilter] = useState('')
  const [hasDriverFilter,setHasDriverFilter] = useState('')
  const [lineIDFilter,setLineIDFilter] = useState('')
  const [ridersSortDirection, setRidersSortDirection] = useState(null)
  const [openAddingNewLineModal,setOpenAddingNewLineModal] = useState(false)
  const [schoolUserName,setSchoolUserName] = useState('')
  const [destinationLocation, setDestinationLocation] = useState(null)
  const [lineCarType,setLineCarType] = useState('')
  const [lineAgeRangeFilter,setLineAgeRangeFilter] = useState("")
  const [lineAgeRange,setLineAgeRange] = useState(null)
  const [lineSeatsNumber,setLineSeatsNumber] = useState(0)
  const [lineSubsAmount,setLineSubsAmount] = useState(0)
  const [addingNewLineLoading,setAddingNewLineLoading] = useState(false)
  const [editingTimes, setEditingTimes] = useState({})
  const [isEditing, setIsEditing] = useState({})
  const [savingNewTimeLoading,setSavingNewTimeLoading] = useState(false)
  const [editingLineDriverAmount,setEditingLineDriverAmount] = useState(false)
  const [newDriverAmount, setNewDriverAmount] = useState(null)
  const [newCompanyAmount, setNewCompanyAmount] = useState(null)
  const [updatingAmountLoading,setUpdatingAmountLoading] = useState(false)
  const [isModalMapVisible,setIsModalMapVisible] = useState(false)
  const [selectedRider, setSelectedRider] = useState(null)
  const [isModalMapVisibleDriver,setIsModalMapVisibleDriver] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [institutions, setInstitutions] = useState([])
  const [fetchingInstitutions, setFetchingInstitutions] = useState(true)
  const [addingRiderToLine,setAddingRiderToLine] = useState(false)
  const [addingDriverToLine,setAddingDriverToLine] = useState(false)
  const [isOpeningSwitchLineModal, setIsOpeningSwitchLineModal] = useState(false)
  const [switchDriver, setSwitchDriver] = useState({id: '',notification_token: null,phone_number: null})
  const [switchLineStartDate, setSwitchLineStartDate] = useState('')
  const [switchLineEndDate, setSwitchLineEndDate] = useState('')
  const [transferType, setTransferType] = useState('determinedPeriode')
  const [transferPeriode, setTransferPeriode] = useState('today')
  const [tripPhases, setTripPhases] = useState({ first: false, second: false })
  const [isTransferringLine, setIsTransferringLine] = useState(false)
  const [isDeletingRiderFromLine,setIsDeletingRiderFromLine] = useState(false)
  const [isDeletingDriverFromLine,setIsDeletingDriverFromLine] = useState(false)
  const [schoolControlType,setSchoolControlType] = useState(false)
  const [openLineDailyDetailsModal,setOpenLineDailyDetailsModal] = useState(false)
  const [selectedPhase, setSelectedPhase] = useState("first")
  const [historyDate, setHistoryDate] = useState(dayjs().tz("Asia/Baghdad").startOf("day"))
  const [lineHistory, setLineHistory] = useState(null)

  // New line time table
  const [schoolTimetable, setSchoolTimetable] = useState([
    { dayIndex:0,day:"الأحد",active: false,startTime: null,endTime: null },
    { dayIndex:1,day:"الاثنين",active: false,startTime: null,endTime: null },
    { dayIndex:2,day:"الثلاثاء",active: false,startTime: null,endTime: null },
    { dayIndex:3,day:"الأربعاء",active: false,startTime: null,endTime: null },
    { dayIndex:4,day:"الخميس",active: false,startTime: null,endTime: null },
    { dayIndex:5,day:"الجمعة",active: false,startTime: null,endTime: null },
    { dayIndex:6,day:"السبت",active: false,startTime: null,endTime: null },
  ]);

  useEffect(() => {
    const storedName = localStorage.getItem('adminDahboardName')
    const schoolLocation = JSON.parse(localStorage.getItem('location'))
    const fullControl = JSON.parse(localStorage.getItem('fullControl'))
    setSchoolUserName(storedName)
    setDestinationLocation(schoolLocation)
    setSchoolControlType(fullControl)
  }, []);

  // Filtered lines based on search term
  const filteredLines = lines.filter((line) => {
    //check line name
    const matchesName = lineDriverNameFilter === '' || line.name.includes(lineDriverNameFilter)

    //check he has a driver or not
    const matchesDriver = 
    hasDriverFilter === '' || 
    (hasDriverFilter === 'true' && line.driver_id) || 
    (hasDriverFilter === 'false' && !line.driver_id);

    //Filter by line id
    const matchesID = lineIDFilter === '' || line.id.includes(lineIDFilter)

    return matchesName && matchesDriver && matchesID
  });

  // Sort lines by riders count
  const sortedLines = filteredLines.sort((a, b) => {
    if (ridersSortDirection === 'asc') return a.riders.length - b.riders.length;
    if (ridersSortDirection === 'desc') return b.riders.length - a.riders.length;
    return 0;
  });

  // Filter by line driver name
  const handleDriverNameChange = (e) => {
    setLineDriverNameFilter(e.target.value);
  };

  // Filter drivers by highest rating
  const handleSortByHighestRiders = () => {
    setRidersSortDirection('desc');
  };
  
  // Filter drivers by lowest rating
  const handleSortByLowestRiders = () => {
    setRidersSortDirection('asc');
  };

  // Handle student has driver change
  const handleHasDriverChange = (e) => {
    setHasDriverFilter(e.target.value);
  }

  // Open create new line modal
  const handleOpenCreateNewLineModal = () => {
    setOpenAddingNewLineModal(true)
  }

  // Close create new line modal
  const handleCloseCreateNewLineModal = () => {
    setOpenAddingNewLineModal(false)
    setLineCarType('')
    setLineAgeRangeFilter('')
    setLineAgeRange(null)
    setLineSeatsNumber(0)
    setLineSubsAmount(0)
    setSchoolTimetable([
      { dayIndex:0,day: "الأحد", active: false, startTime: null, endTime: null },
      { dayIndex:1,day: "الاثنين", active: false, startTime: null, endTime: null },
      { dayIndex:2,day: "الثلاثاء", active: false, startTime: null, endTime: null },
      { dayIndex:3,day: "الأربعاء", active: false, startTime: null, endTime: null },
      { dayIndex:4,day: "الخميس", active: false, startTime: null, endTime: null },
      { dayIndex:5,day: "الجمعة", active: false, startTime: null, endTime: null },
      { dayIndex:6,day: "السبت", active: false, startTime: null, endTime: null },
    ]);
  }

  // New line car type
  const handleLineCarTypeChange = (e) => {
    setLineCarType(e.target.value)
  }

  // Age range
  const ageRanges = {
    "اقل من 6 سنوات": { minAge: 0, maxAge: 5 },
    "من 6 الى 12": { minAge: 6, maxAge: 12 },
    "من 13 الى 15": { minAge: 13, maxAge: 15 },
    "من 16 الى 18": { minAge: 16, maxAge: 18 },
    "اكبر من 18 سنة": { minAge: 19, maxAge: 999 },
  };

  // New line age range
  const handleLineAgeRangeChange = (e) => {
    const selectedLabel = e.target.value;
    setLineAgeRangeFilter(selectedLabel);
    setLineAgeRange(ageRanges[selectedLabel] || null);
  }

  // New line Seats number
  const handleLineSeatsNumber = (e) => {
    setLineSeatsNumber(e.target.value)
  }

  //New line time table 
  const toggleDayActive = (dayIndex) => {
    setSchoolTimetable((prev) =>
      prev.map((item) =>
        item.dayIndex === dayIndex ? {
          ...item,
          active: !item.active,
          startTime: !item.active ? item.startTime : null,
          endTime: !item.active ? item.endTime : null,
        } : item
      )
    );
  }

  // Convert "HH:mm" string to Date (Jan 1, 2000)
  const timeStringToDate = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(":").map(Number);
    const d = new Date(2000, 0, 1, hours, minutes);
    return d;
  }

  // ✅ Convert Date → "HH:mm" string
  const dateToTimeString = (date) => {
    if (!(date instanceof Date) || isNaN(date)) return "";
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  const handleTimeChange = (dayIndex, field, value) => {
    const dateObj = timeStringToDate(value);
    setSchoolTimetable((prev) =>
      prev.map((item) =>
        item.dayIndex === dayIndex ? { ...item, [field]: dateObj } : item
      )
    );
  }

  // Utility to format numbers with commas
  const formatNumberWithCommas = (value) => {
    if (!value && value !== 0) return "";
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // Utility to remove commas
  const parseNumber = (value) => {
    return value.replace(/,/g, "");
  }

  // Handlers
  const handleLineDriverSubsAmount = (e) => {
    const rawValue = parseNumber(e.target.value);
    if (!isNaN(rawValue)) {
      setLineSubsAmount(rawValue);
    }
  }

  // Create new line handler
  const createNewLineHandler = async() => {
    if(!schoolUserName) {
      alert('الرجاء المحاولة مرة ثانية')
      return;
    }

    if(!destinationLocation) {
      alert('الرجاء المحاولة مرة ثانية')
      return;
    }

    if(!lineCarType) {
      alert('يرجى تحديد نوع السيارة')
      return;
    }

    if(!lineAgeRange) {
      alert('يرجى تحديد معدل الاعمار')
      return;
    }

    if(!lineSeatsNumber) {
      alert('يرجى تحديد عدد المقاعد')
      return;
    }

    const incomplete = schoolTimetable.find(
      (d) => d.active && (!d.startTime || !d.endTime)
    )

    if (incomplete) {
      alert(`يرجى إدخال وقت الدخول والخروج ليوم ${incomplete.day}`);
      return;
    }

    if(!lineSubsAmount) {
      alert('يرجى تحديد اجرة السائق')
      return;
    }

    try {
      setAddingNewLineLoading(true)

      const lineName = schoolUserName.split(' ').slice(0, 2).join(' ');

      const lineRef = doc(collection(DB, 'lines'))

      const newLine = {
        name:lineName,
        destination: schoolUserName,
        destination_location:destinationLocation,
        driver_id:null,
        driver_notification_token:null,
        driver_phone_number:null,
        line_type: lineCarType,
        timeTable: schoolTimetable,
        riders: [],
        seats_capacity: Number(lineSeatsNumber),
        age_range: lineAgeRange,
        center_point_location: destinationLocation,
        standard_driver_commission: Number(lineSubsAmount) || 50000,
        standard_company_commission: 0
      }

      await setDoc(lineRef, newLine)
      alert('تم إنشاء الخط بنجاح');

    } catch (error) {
      alert('حدث خطأ أثناء إنشاء الخط');
      console.log(error)
    } finally {
      setAddingNewLineLoading(false)
      setOpenAddingNewLineModal(false)
      setLineCarType('')
      setLineAgeRangeFilter('')
      setLineAgeRange(null)
      setLineSeatsNumber(0)
      setLineSubsAmount(0)
      setSchoolTimetable([
        { dayIndex:0,day: "الأحد", active: false, startTime: null, endTime: null },
        { dayIndex:1,day: "الاثنين", active: false, startTime: null, endTime: null },
        { dayIndex:2,day: "الثلاثاء", active: false, startTime: null, endTime: null },
        { dayIndex:3,day: "الأربعاء", active: false, startTime: null, endTime: null },
        { dayIndex:4,day: "الخميس", active: false, startTime: null, endTime: null },
        { dayIndex:5,day: "الجمعة", active: false, startTime: null, endTime: null },
        { dayIndex:6,day: "السبت", active: false, startTime: null, endTime: null },
      ]);
    }
  }

  // Handle back action
  const goBack = () => {
    setSelectedLine(null)
    setIsEditing({})
    setEditingTimes({})
  };

  //Calculate rider age
  const calculateAge = (birthdate) => {
    const birthDate = new Date(birthdate.seconds * 1000); // Convert Firestore Timestamp to JS Date
    const today = new Date();
    
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
  
    // Adjust age if the current date is before the birthdate this year
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  
    return age;
  };

  // Handle edit line time table click
  const handleEditClick = (index, startTime, endTime) => {
    setIsEditing((prev) => ({ ...prev, [index]: true }));

    const toTimeString = (timestamp) => {
      if (!timestamp) return "00:00";
      const d = new Date(timestamp.seconds * 1000);
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }

    setEditingTimes((prev) => ({
      ...prev,
      [index]: {
        startTime: toTimeString(startTime),
        endTime: toTimeString(endTime),
      },
    }))
  }

  // Edit line current time table
  const handleEditTimeChange = (index, field, value) => {
    setEditingTimes((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value,   // field is "startTime" or "endTime"
      },
    }));
  }

  // Confirm the line's time table update
  const handleUpdateLineTimeTable = async () => {
    try {
      setSavingNewTimeLoading(true)
      const batch = writeBatch(DB);
      const lineRef = doc(DB, "lines", selectedLine.id);

      const updatedTimeTable = selectedLine.timeTable.map((day,index) => {
        if (editingTimes[index]) {
          const { startTime,endTime } = editingTimes[index];

          const makeTimestamp = (time) => {
            const [h, m] = time.split(":").map(Number);
            return Timestamp.fromDate(new Date(2000, 0, 1, h, m));
          };

          const isDeactivated = startTime === "00:00" && endTime === "00:00";

          return {
            ...day,
            startTime: isDeactivated ? null : makeTimestamp(startTime),
            endTime: isDeactivated ? null : makeTimestamp(endTime),
            active: !isDeactivated,
          };
        }
        return day;
      });

      batch.update(lineRef, { timeTable: updatedTimeTable });

      if(selectedLine?.driver_id) {
        const driverRef = doc(DB, "drivers", selectedLine.driver_id);
        const driverSnap = await getDoc(driverRef);
        if (!driverSnap.exists()) {
          alert("السائق غير موجود في قاعدة البيانات");
          return;
        }

        const driverData = driverSnap.data();
        const updatedDriverLines = driverData.lines.map((line) =>
          line.id === selectedLine.id
            ? { ...line, timeTable: updatedTimeTable }
            : line
        );

        batch.update(driverRef, { lines: updatedDriverLines });
      }

      await batch.commit();

      // 6. ✅ Send notification (if token exists)
      if (selectedLine?.driver_notification_token) {
        await sendNotification(
          selectedLine?.driver_notification_token,
          "تحديث في توقيت الخط",
          `تم تعديل التوقيت اليومي لخط ${selectedLine.name}`
        )
      }

      setSelectedLine((prev) => ({
        ...prev,
        timeTable: updatedTimeTable,
      }));

      alert("تم تحديث الجدول بنجاح");
      setIsEditing({});
      setEditingTimes({});
    } catch (error) {
      console.error("خطأ في تحديث وقت الانطلاق:", error);
      alert("حدث خطأ أثناء تحديث الجدول");
    } finally {
      setSavingNewTimeLoading(false)
    }
  };

  // Format time for display
  const formatTime = (timestamp,active) => {
    if (!active) return "--";
    if (!timestamp) return "--";
    return new Date(timestamp.seconds * 1000).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // format line subs amount
  const formatAccountBalanceFee = (amount) => {
    return amount?.toLocaleString('ar-IQ', {
      style: 'currency',
      currency: 'IQD',
      minimumFractionDigits: 0,
    });
  }

  //Format line age range text
  const formatAgeRangeText = (ageRange) => {
    const { minAge, maxAge } = ageRange;

    if (minAge === 0 && maxAge === 5) {
      return 'أقل من 6 سنوات';
    }

    if (minAge === 19 && maxAge === 999) {
      return 'أكبر من 18 سنة';
    }

    return `من ${minAge} إلى ${maxAge} سنة`;
  }

  // Update line fees (driver / company)
  const handleUpdateSubsAmount = async () => {
    try {
      setUpdatingAmountLoading(true);

      const batch = writeBatch(DB);
      const lineRef = doc(DB, "lines", selectedLine.id);

      // fallback to old values if not editing
      const driverAmount = newDriverAmount !== null 
        ? Number(newDriverAmount) 
        : selectedLine.standard_driver_commission;

      const companyAmount = newCompanyAmount !== null 
        ? Number(newCompanyAmount) 
        : selectedLine.standard_company_commission;

      // --- Update riders in line ---
      const updatedRiders = selectedLine.riders.map((rider) => ({
        ...rider,
        driver_commission: driverAmount,
        company_commission: companyAmount,
      }));

      batch.update(lineRef, {
        standard_driver_commission: driverAmount,
        standard_company_commission: companyAmount,
        riders: updatedRiders,
      });

      // --- Update riders collection ---
      if(selectedLine?.riders?.length > 0) {
        selectedLine.riders.forEach((rider) => {
          const riderRef = doc(DB, "riders", rider.id); // assuming rider.id is the rider doc id
          batch.update(riderRef, {
            driver_commission: driverAmount,
            company_commission: companyAmount,
          });
        });
      }
        
      // --- If line is attached to a driver ---
      if (selectedLine?.driver_id) {
        const driverRef = doc(DB, "drivers", selectedLine.driver_id);
        const driverSnap = await getDoc(driverRef);
        if (driverSnap.exists()) {
          const driverData = driverSnap.data();

          const updatedDriverLines = driverData.lines.map((line) => {
            if (line.id === selectedLine.id) {
              return {
                ...line,
                riders: line.riders.map((rider) => ({
                  ...rider,
                  driver_commission: driverAmount,
                  company_commission: companyAmount,
                })),
              };
            }
            return line;
          });

          batch.update(driverRef, { lines: updatedDriverLines });
        }
      }

      await batch.commit();

      // update UI
      setSelectedLine((prev) => ({
        ...prev,
        standard_driver_commission: driverAmount,
        standard_company_commission: companyAmount,
      }));

      alert("تم تحديث الاشتراك الشهري بنجاح");

      // reset editing states
      setEditingLineDriverAmount(false);
      setNewDriverAmount(null);
      setNewCompanyAmount(null);
    } catch (error) {
      console.error("خطأ في تحديث الاشتراك:", error);
      alert("حدث خطأ أثناء تحديث الاشتراك");
    } finally {
      setUpdatingAmountLoading(false);
    }
  }

  // Handle notification sending
  const sendNotification = async (token,title,body) => {
    try {
      const message = {
        to: token,
        sound: 'default',
        title: title,
        body: body 
      };

      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });
      
    } catch (error) {
      console.log("Error sending notification:", error);
    }
  }

  // Map Style
  const containerStyle = {
    width: '100%',
    height: '100%'
  }

  //Open Map Modal (riders)
  const handleOpenMapModal = () => {
    setIsModalMapVisible(true)
  }

  //Close Map Modal (riders)
  const handleCloseMapModal = () => {
    setIsModalMapVisible(false)
    setSelectedRider(null)
  }

  // filter eligible riders
  const eligibleRiders = useMemo(() => {
    return riders.filter((r) => {
      const sameDestination = r?.destination === selectedLine?.destination;
      const freeToJoin = !r?.line_id && !r?.driver_id;
      return sameDestination && freeToJoin;
    });
  }, [riders, selectedLine]);

  //Open Map Modal (drivers)
  const handleOpenMapModalDrivers = () => {
    setIsModalMapVisibleDriver(true)
  }

  //Close Map Modal (drivers)
  const handleCloseMapModalDrivers = () => {
    setIsModalMapVisibleDriver(false)
  }

  // filter eligible riders
  const eligibleDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const serviceType = d?.service_type === 'خطوط'
      const carType = d?.car_type === selectedLine?.line_type
      return serviceType && carType;
    });
  }, [drivers, selectedLine]);

  //Center the map around destination and all riders location
  const allLineCoordinates = useMemo(() => {
    if (!selectedLine) return [];

    const coords = [];

    // Add destination
    if (selectedLine?.destination_location) {
      coords.push({
        lat: selectedLine.destination_location.latitude,
        lng: selectedLine.destination_location.longitude,
      });
    }

    // Add riders' home locations
    if (selectedLine?.riders?.length > 0) {
      selectedLine.riders.forEach((r) => {
        coords.push({
          lat: r.home_location.latitude,
          lng: r.home_location.longitude,
        });
      });
    }

    // Eligible riders' home locations
    if (eligibleRiders?.length > 0) {
      eligibleRiders.forEach((r) => {
        coords.push({
          lat: r.home_location.latitude,
          lng: r.home_location.longitude,
        });
      });
    }

    return coords;
  }, [selectedLine]);

  const handleMapLoad = (map) => {
    if (allLineCoordinates.length === 0) return;

    const bounds = new window.google.maps.LatLngBounds();
    allLineCoordinates.forEach((coord) => bounds.extend(coord));

    map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 }); // padding
  }

  //Fetch B2B institutions
  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const snapshot = await getDocs(collection(DB, 'institutions'));
        const fetchedInstitutions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInstitutions(fetchedInstitutions);
      } catch (error) {
        console.log("Failed to fetch institutions:", error);
      } finally {
        setFetchingInstitutions(false);
      }
    };

    fetchInstitutions();
  }, [])

  //Add rider to the line
  const addRiderToLine = async (rider) => {
    if (!rider || !selectedLine) return alert("❌ خط أو راكب غير محدد");

    try {
      setAddingRiderToLine(true)
      const riderRef = doc(DB, "riders", rider.id);
      const lineRef = doc(DB, "lines", selectedLine.id);
      const userRef = doc(DB, "users", rider.user_doc_id);

      const batch = writeBatch(DB);

      // Fetch user
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        return alert("❌ لم يتم العثور على حساب المستخدم.");
      }
      const userData = userSnap.data();
      const currentBalance = userData.account_balance || 0;

      // Check if rider is from an institution
      const isInstitutionRider = institutions.some((inst) => inst.name === selectedLine.destination);

      const driverCommission = selectedLine.standard_driver_commission || 50000;
      const companyCommission = selectedLine.standard_company_commission || 0;
      const totalLineCost = driverCommission + companyCommission;

      if (!isInstitutionRider && currentBalance < totalLineCost) {
        return alert(`الرصيد غير كافٍ للانضمام لهذا الخط. المبلغ المطلوب هو ${totalLineCost.toLocaleString()} د.ع.`);
      }

      // Rider payload
      const riderData = {
        name: rider.full_name,
        family_name: rider.family_name,
        id: rider.id,
        birth_date: rider.birth_date,
        phone_number: rider.phone_number,
        notification_token: rider.user_notification_token,
        home_address: rider.home_address,
        home_location: {
          latitude: rider.home_location.latitude,
          longitude: rider.home_location.longitude,
        },
        driver_commission: driverCommission,
        company_commission: companyCommission,
      };

      // ✅ Check if this is the first rider
      const isFirstRider = !selectedLine.riders || selectedLine.riders.length === 0;

      // If line has a driver, also update driver
      if (selectedLine.driver_id) {
        const now = new Date();
        let end = new Date();

        if (isInstitutionRider) {
          const currentYear = now.getFullYear();
          const endYear = now.getMonth() >= 5 ? currentYear + 1 : currentYear;
          end = new Date(endYear, 5, 15);
        } else {
          end.setDate(now.getDate() + 30);
        }

        const startTimestamp = Timestamp.fromDate(now);
        const endTimestamp = Timestamp.fromDate(end);

        riderData.service_period = {
          start_date: startTimestamp,
          end_date: endTimestamp,
        };

        const driverRef = doc(DB, "drivers", selectedLine.driver_id);

        // 1️. Update line with rider
        batch.update(lineRef, {
          riders: arrayUnion(riderData),
          ...(isFirstRider && {
          center_point_location: {
            latitude: rider.home_location.latitude,
            longitude: rider.home_location.longitude,
          }
        })
        });

        // 2️. Update driver with rider
        const driverSnap = await getDoc(driverRef);
        if (!driverSnap.exists()) return alert("❌ لم يتم العثور على السائق.");
        const driverData = driverSnap.data();
        const driverLines = driverData.lines || [];

        const updatedLines = driverLines.map((l) => {
          if (l.id === selectedLine.id) {
            const exists = l.riders?.some((r) => r.id === rider.id);
            if (!exists) {
              return {
                ...l,
                riders: [...(l.riders || []), riderData],
              };
            }
          }
          return l;
        });

        batch.update(driverRef, {
          lines: updatedLines,
        });

        // 3. Update rider doc
        batch.update(riderRef, {
          line_id: selectedLine.id,
          driver_id: selectedLine.driver_id,
          driver_commission: driverCommission,
          company_commission: companyCommission,
          service_period: {
            start_date: startTimestamp,
            end_date: endTimestamp,
          },
        });

        //Send notification (if token exists)
        if (selectedLine.driver_notification_token) {
          await sendNotification(
            selectedLine.driver_notification_token,
            "راكب جديد",
            `راكب جديد انضم إلى خط ${selectedLine.name}`
          )
        }

      } else {
        // If no driver assigned
        batch.update(lineRef, {
          riders: arrayUnion(riderData),
          ...(isFirstRider && {
            center_point_location: {
              latitude: rider.home_location.latitude,
              longitude: rider.home_location.longitude,
            }
          })
        })

        batch.update(riderRef, {
          line_id: selectedLine.id,
          driver_commission: driverCommission,
          company_commission: companyCommission,
          temporary_hold_amount: isInstitutionRider ? 0 : totalLineCost,
        })
      }

      // Deduct balance
      if (!isInstitutionRider) {
        batch.update(userRef, {
          account_balance: currentBalance - totalLineCost,
        });
      }

      await batch.commit()

      // Update local state for immediate UI feedback
      setSelectedLine((prev) =>
        prev ? {
          ...prev,
          riders: [...(prev.riders || []), riderData],
          ...(isFirstRider && {
            center_point_location: rider.home_location,
          })
        } : prev
      )

      alert("✅ تم إضافة الراكب إلى الخط بنجاح");
      setSelectedRider(null);
    } catch (error) {
      console.error("Error adding rider:", error);
      alert("❌ حدث خطأ أثناء إضافة الراكب");
    } finally{
      setAddingRiderToLine(false)
      setIsModalMapVisible(false)
      setSelectedRider(null)
    }
  }

  // Remove rider from the line
  const deleteRiderFromLineHandler = async (riderId) => {
    if (!selectedLine || !riderId) return;

    const confirmDelete = window.confirm("هل أنت متأكد أنك تريد حذف هذا الراكب من الخط؟");
    if (!confirmDelete) return;

    try {
      setIsDeletingRiderFromLine(true);
      const batch = writeBatch(DB);
      const riderRef = doc(DB, "riders", riderId);
      const lineRef = doc(DB, "lines", selectedLine?.id);

      // 1. Update rider document
      const riderSnap = await getDoc(riderRef)
      if(riderSnap.exists()) {
        const riderData = riderSnap.data()

        const serviceStart = riderData?.service_period?.start_date;
        const now = new Date();

        const updatedOldLines = [
          ...(riderData.old_lines || []),
          {
            start_date: serviceStart ?? null,
            end_date: now,
            line_id: riderData.line_id
          }
        ]

        batch.update(riderRef, {
          checked_at_home: false,
          company_commission: 0,
          driver_commission: 0,
          driver_id: null,
          line_id: null,
          trip_status: 'at home',
          service_period: {
            start_date: null,
            end_date: null
          },
          old_lines: updatedOldLines
        });
      }

      // 2. Update the line doc
      const updatedRiders = (selectedLine.riders || []).filter((rider) => rider.id !== riderId);

      batch.update(lineRef, {
        riders: updatedRiders,
      });

      // 3. If the line is assigned to a driver
      if (selectedLine?.driver_id) {
        const driverRef = doc(DB, "drivers", selectedLine?.driver_id);
        const driverSnap = await getDoc(driverRef);

        if (driverSnap.exists()) {
          const driverData = driverSnap.data();

          const updatedDriverLines = (driverData.lines || []).map((line) => {
            if (line.id === selectedLine.id) {
              return {
                ...line,
                riders: (line.riders || []).filter((r) => r.id !== riderId),
              };
            }
            return line;
          });

          batch.update(driverRef, {
            lines: updatedDriverLines,
          });
        }
      }

      // 4. commit the batch
      await batch.commit();

      // 5. Update local state (remove rider from selectedLine)
      setSelectedLine((prevLine) => ({
        ...prevLine,
        riders: (prevLine.riders || []).filter((rider) => rider.id !== riderId),
      }));

      // 6. ✅ Send notification (if token exists)
      if (selectedLine.driver_notification_token) {
        await sendNotification(
          selectedLine.driver_notification_token,
          "تحديث في قائمة الركاب",
          `تم حذف راكب من خط ${selectedLine.name}`
        )
      }

      alert("تم حذف الطالب من الخط بنجاح!");

    } catch (error) {
      console.log("Error removing rider from line:", error);
      alert("حدث خطأ أثناء حذف الطالب.");
    } finally {
      setIsDeletingRiderFromLine(false);
    }
  };

  // Open switch line to other driver Modal
  const openSwitchLineModal = () => {
    setIsOpeningSwitchLineModal(true)
  }

  // Close switch line to other driver modal
  const handleCloseSwitchLineModal = () => {
    setIsOpeningSwitchLineModal(false)
    setSwitchLineStartDate('')
    setSwitchLineEndDate('')
    setTransferType('determinedPeriode')
    setTransferPeriode('today')
    setSwitchDriver({id: '',notification_token: null,phone_number: null})
  }

  // Select substitute driver
  const switchDriverChangeHandler = (e) => {
    const selectedId = e.target.value;
    const driver = drivers.find(d => d.id === selectedId);

    if (driver) {
      setSwitchDriver({
        id: driver.id,
        notification_token: driver.notification_token || null,
        phone_number: driver.phone_number || null,
      });
    }
  }

  // Handle date selection (date-only) [start periode]
  const handleSwitchLineStartDate = (e) => {
    setSwitchLineStartDate(e.target.value);
  };

  // Handle date selection (date-only) [start periode]
  const handleSwitchLineEndDate = (e) => {
    setSwitchLineEndDate(e.target.value);
  };

  // Get Tomorrow date
  const getTomorrowDateString = () => {
    const today = new Date();
    today.setDate(today.getDate() + 1); // Move to tomorrow
    return today.toISOString().split("T")[0]; // Format YYYY-MM-DD
  }

  // Transfer line to another driver
  const handleTransferLineToDriverB = async () => {
    if(!switchDriver?.id) {
      alert('يرجى تحديد السائق البديل')
      return
    }

    if(transferType === 'determinedPeriode' && transferPeriode === 'future') {
      if(!switchLineStartDate && !switchLineEndDate) {
        alert('يرجى تحديد المدة الزمنية')
        return
      }
    }

    if(transferType === 'determinedPeriode' && transferPeriode === 'today') {
      if(!tripPhases.first && !tripPhases.second) {
        alert('يرجى تحديد رحلة الذهاب او العودة')
        return
      }
    }
    
    if (isTransferringLine) return;
    
    setIsTransferringLine(true);
  
    try {
      const driverARef = doc(DB, "drivers", selectedLine?.driver_id);
      const driverBRef = doc(DB, "drivers", switchDriver?.id);
      const lineRef = doc(DB, "lines", selectedLine?.id)
      const batch = writeBatch(DB);
  
      const [driverASnap, driverBSnap] = await Promise.all([
        getDoc(driverARef),
        getDoc(driverBRef)
      ]);
  
      if (!driverASnap.exists() || !driverBSnap.exists()) throw new Error("Driver not found");
  
      const driverAData = driverASnap.data();
      const driverBData = driverBSnap.data();

      if(transferType === 'determinedPeriode' && transferPeriode === 'future') {
        const startDate = new Date(switchLineStartDate);
        startDate.setUTCHours(0, 0, 0, 0);
        const endDate = new Date(switchLineEndDate);
        endDate.setUTCHours(0, 0, 0, 0);

        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(endDate);

        // === Copy the exact line from driver A
        const originalLine = driverAData.lines.find(l => l.id === selectedLine?.id);
        if (!originalLine) throw new Error("Line not found in driver A");

        // === Update original driver's line
        const updatedDriverALines = driverAData.lines.map((line) =>
          line.id === selectedLine?.id
            ? {
                ...line,
                desactive_periode: { start: startTimestamp, end: endTimestamp },
                subs_driver: switchDriver?.id,
              }
            : line
        );
        batch.update(driverARef, { lines: updatedDriverALines });

        // === Add to substitute driver's line (exact copy of A’s line + extra fields)
        const futureLine = {
          ...originalLine,
          active_periode: { start: startTimestamp, end: endTimestamp },
          original_driver: selectedLine?.driver_id,
        };
        const updatedDriverBLines = [...(driverBData.lines || []), futureLine];
        batch.update(driverBRef, { lines: updatedDriverBLines });

        // === Build transfer object
        const transferObj = {
          driverA: selectedLine?.driver_id,
          driverB: switchDriver?.id,
          type: 'determinedPeriode',
          startDate: startTimestamp,
          endDate: endTimestamp,
        };

        // === Update line doc
        batch.update(lineRef, {
          transferredTo: arrayUnion(transferObj)
        });
      }

      //Today transfer
      if (transferType === 'determinedPeriode' && transferPeriode === 'today') {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const yearMonthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}`;
        const dayKey = today.getDate().toString().padStart(2, "0");
  
        const driverADaily = driverAData?.dailyTracking?.[yearMonthKey]?.[dayKey];
        const driverBDaily = driverBData?.dailyTracking?.[yearMonthKey]?.[dayKey];

        // === Find today’s timetable for this line
        const todayDayIndex = today.getDay(); // Sunday=0, Monday=1...
        const todayTimetable = selectedLine.timeTable?.find((t) => t.active && t.dayIndex === todayDayIndex)

        const startTimestamp = todayTimetable?.startTime || null;
        const endTimestamp = todayTimetable?.endTime || null;
  
        // === Prepare line data to push to driver B
        const commonLineData = {
          id: selectedLine.id,
          name: selectedLine.name,
          start_time:startTimestamp,
          end_time:endTimestamp
        };

        // helpers for rider shape
        const ridersForFirstPhase = (selectedLine.riders || []).map(r => ({
          id: r.id,
          name: r.name,
          family_name: r.family_name,
          home_location: r.home_location || null,
          notification_token: r.notification_token || null,
          phone_number: r.phone_number || null,
          checked_at_home: false,
          picked_up: false,
        }));

        const ridersForSecondPhase = (selectedLine.riders || []).map(r => ({
          id: r.id,
          name: r.name,
          family_name: r.family_name,
          home_location: r.home_location || null,
          notification_token: r.notification_token || null,
          phone_number: r.phone_number || null,
          dropped_off: false,
        }));

        let lineForDriverA = null;
        let lineForDriverB = null;

        if (tripPhases.first === true && tripPhases.second === false) {
          lineForDriverB = {
            ...commonLineData,
            first_phase: {
              destination: selectedLine.destination,
              destination_location: selectedLine.destination_location,
              phase_started:false,
              phase_finished: false,
              riders:ridersForFirstPhase
            },
            second_phase: {
              handled_by_other_driver: true,
              phase_finished: true,
            },
          };

          lineForDriverA = {
            ...commonLineData,
            first_phase: {
              handled_by_other_driver: true,
              phase_finished: true,
            },
            second_phase: {
              phase_started:false,
              phase_finished: false,
              riders: ridersForSecondPhase
            },
          };

        } else if (tripPhases.first === false && tripPhases.second === true) {
          lineForDriverB = {
            ...commonLineData,
            first_phase: {
              handled_by_other_driver: true,
              phase_finished: true,
            },
            second_phase: {
              phase_started:false,
              phase_finished: false,
              riders: ridersForSecondPhase
            },
          }

          lineForDriverA = {
            ...commonLineData,
            first_phase: {
              destination: selectedLine.destination,
              destination_location: selectedLine.destination_location,
              phase_started:false,
              phase_finished: false,
              riders: ridersForFirstPhase,
            },
            second_phase: {
              handled_by_other_driver: true,
              phase_finished: true,
            },
          };
  
        } else if (tripPhases.first === true && tripPhases.second === true) {
          lineForDriverB = {
            ...commonLineData,
            first_phase: {
              destination: selectedLine.destination,
              destination_location: selectedLine.destination_location,
              phase_started:false,
              phase_finished: false,
              riders: ridersForFirstPhase,
            },
            second_phase: {
              phase_started:false,
              phase_finished: false,
              riders: ridersForSecondPhase
            },
          }

          lineForDriverA = {
            ...commonLineData,
            first_phase: {
              handled_by_other_driver: true,
              phase_finished: true,
            },
            second_phase: {
              handled_by_other_driver: true,
              phase_finished: true,
            },
          };
  
        } else {
          alert('يرجى تحديد نوع الرحلة ذهاب او عودة')
          setIsTransferringLine(false);
          return;
        }

        // helper: replace-or-insert (prevents duplicates)
        const replaceOrInsert = (arr = [], newLine) => {
          if (!newLine) return arr;
          const filtered = arr.filter(l => l.id !== newLine.id);
          return [...filtered, newLine];
        };

        if(driverADaily) {
          const updatedDriverATodayLines = replaceOrInsert(driverADaily?.today_lines || [], lineForDriverA);
          const updatedDriverADaily = { ...(driverADaily || {}), today_lines: updatedDriverATodayLines };
          batch.update(driverARef, { [`dailyTracking.${yearMonthKey}.${dayKey}`]: updatedDriverADaily });
        } else {
          const startTimestamp = Timestamp.fromDate(today);
          const endTimestamp = Timestamp.fromDate(today);
          const updatedDriverALines = driverAData.lines.map(line =>
            line.id === selectedLine?.id
              ? {
                ...line,
                desactive_periode: { start: startTimestamp, end: endTimestamp },
                subs_driver: switchDriver?.id,
              }
            : line
          )
          batch.update(driverARef, { lines: updatedDriverALines });
        }

        if(driverBDaily) {
          // === If driver B has started journey → push into dailyTracking
          const updatedDriverBTodayLines = replaceOrInsert(driverBDaily?.today_lines || [], lineForDriverB);
          const updatedDriverBDaily = { ...(driverBDaily || {}), today_lines: updatedDriverBTodayLines };
          batch.update(driverBRef, { [`dailyTracking.${yearMonthKey}.${dayKey}`]: updatedDriverBDaily });
        } else {
          const startTimestamp = Timestamp.fromDate(today);
          const endTimestamp = Timestamp.fromDate(today);
          const originalLine = driverAData.lines.find(l => l.id === selectedLine?.id);
          if (!originalLine) throw new Error("Line not found in driver A");
          const futureLine = {
            ...originalLine,
            active_periode: { start: startTimestamp, end: endTimestamp },
            original_driver: selectedLine?.driver_id,
          };
          const updatedDriverBLines = [...(driverBData.lines || []), { ...futureLine }];
          batch.update(driverBRef, { lines: updatedDriverBLines });
        }

        // Save transfer data inside line doc
        const todayStart = Timestamp.fromDate(today)
        const todayEnd = Timestamp.fromDate(today)

        // === Build transfer object
        const transferObj = {
          driverA: selectedLine?.driver_id,
          driverB: switchDriver?.id,
          type: 'determinedPeriode',
          startDate: todayStart,
          endDate: todayEnd,
        };

        // === Update line doc
        batch.update(lineRef, {
          transferredTo: arrayUnion(transferObj)
        });

      }

      if(transferType === 'permanente') {
        const originalLine = driverAData.lines.find(l => l.id === selectedLine?.id);
        if (!originalLine) throw new Error("Line not found in driver A");

        // === Remove line from driver A completely
        const updatedDriverALines = driverAData.lines.filter(l => l.id !== selectedLine?.id);
        batch.update(driverARef, { lines: updatedDriverALines });

        // === Add line to driver B permanently
        const updatedDriverBLines = [...(driverBData.lines || []), originalLine ];
        batch.update(driverBRef, { lines: updatedDriverBLines });

        // === Update each rider document with new driver_id
        (selectedLine.riders || []).forEach(rider => {
          const riderRef = doc(DB, "riders", rider.id);
          batch.update(riderRef, { driver_id: switchDriver?.id });
        });

        // === Build transfer object
        const transferObj = {
          driverA: selectedLine?.driver_id,
          driverB: switchDriver?.id,
          type: 'permanente',
          startDate: Timestamp.now(),
          endDate: null,
        };

        // === Update line doc with new permanent driver + append to transfer history
        batch.update(lineRef, {
          driver_id: switchDriver?.id,
          driver_notification_token:switchDriver?.notification_token,
          driver_phone_number:switchDriver?.phone_number,
          transferredTo: arrayUnion(transferObj)
        });
      }
  
      await batch.commit();
      alert("✅ تم نقل الخط بنجاح!");
    } catch (err) {
      console.error("Transfer failed:", err);
      alert("❌ خطأ أثناء نقل الخط");
    } finally {
      setSwitchDriver({id: '',notification_token: null,phone_number: null})
      setSwitchLineStartDate('')
      setSwitchLineEndDate('')
      setIsOpeningSwitchLineModal(false)
      setIsTransferringLine(false)
    }
  }

  // Assign driver to line (from dashboard)
  const assignDriver = async (driver) => {
    if (!driver || !selectedLine) return;

    setAddingDriverToLine(true);

    try {
      const now = new Date();
      let end = new Date();

      // Check if the line is institution-based
      const isInstitutionRider = institutions.some(inst => inst.name === selectedLine.destination)

      if (isInstitutionRider) {
        const currentYear = now.getFullYear();
        const endYear = now.getMonth() >= 5 ? currentYear + 1 : currentYear;
        end = new Date(endYear, 5, 15); // June 15th
      } else {
        end.setDate(now.getDate() + 30); // default 30 days
      }

      const startTimestamp = Timestamp.fromDate(now);
      const endTimestamp = Timestamp.fromDate(end);

      const batch = writeBatch(DB);

      const driverRef = doc(DB, "drivers", driver?.id);
      const lineRef = doc(DB, "lines", selectedLine?.id);

      const riderNotificationTokens = [];

      // update riders with driver + service period
      const updatedRiders = (selectedLine.riders || []).map((r) => {
        const updatedRider = {
          ...r,
          service_period: {
            start_date: startTimestamp,
            end_date: endTimestamp,
          },
        };

        if (r.notification_token) {
          riderNotificationTokens.push({
            token: r.notification_token,
            name: r.name,
          });
        }

        const riderRef = doc(DB, "riders", r.id);
        batch.update(riderRef, {
          driver_id: driver?.id,
          temporary_hold_amount: 0,
          service_period: {
            start_date: startTimestamp,
            end_date: endTimestamp,
          },
        });

        return updatedRider;
      });

      // create a copy of the line to store in driver's profile
      const copiedLineData = {
        id: selectedLine.id,
        name: selectedLine.name,
        destination: selectedLine.destination,
        destination_location: selectedLine.destination_location,
        timeTable: selectedLine.timeTable,
        riders: updatedRiders,
      };

      // 1. Add line to driver's "lines"
      batch.update(driverRef, {
        lines: arrayUnion(copiedLineData),
      });

      // 2. Update line with driver info
      batch.update(lineRef, {
        driver_id: driver?.id,
        driver_notification_token: driver?.notification_token || null,
        driver_phone_number: driver?.phone_number || null,
        riders: updatedRiders,
      });

      await batch.commit();

      // ✅ Update local state immediately
      setSelectedLine(prev =>
        prev ? {
            ...prev,
            driver_id: driver?.id,
            driver_notification_token: driver?.notification_token || null,
            driver_phone_number: driver?.phone_number || null,
            riders: updatedRiders,
          }
        : prev
      )

      // 🔔 notify riders
      for (const rider of riderNotificationTokens) {
        await sendNotification(
          rider.token,
          "تم ربط خطك بسائق",
          `تم ربط خطك "${selectedLine.name}" بالسائق ${driver.full_name}`
        );
      }

      alert("تم ربط السائق بالخط بنجاح");
      setSelectedDriver(null);
    } catch (error) {
      console.error(error);
      alert("خطأ", "حدث خطأ أثناء ربط السائق بالخط");
    } finally {
      setAddingDriverToLine(false)
      setIsModalMapVisibleDriver(false)
      setSelectedDriver(null)
    }
  };

  // Delete driver from the line
  const deleteDriverFromLineHandler = async() => {
    if (!selectedLine || !selectedLine?.driver_id) return;

    const confirmDelete = window.confirm("هل أنت متأكد أنك تريد إزالة السائق من هذا الخط؟");
    if (!confirmDelete) return;

    setIsDeletingDriverFromLine(true);

    try {
      const batch = writeBatch(DB);
      const lineRef = doc(DB, "lines", selectedLine.id);
      const driverRef = doc(DB, "drivers", selectedLine.driver_id);

      // 1. Update line: remove driver_id
      batch.update(lineRef, {
        driver_id: null,
        driver_notification_token:null,
        driver_phone_number:null
      });

      // 2. Remove line from driver's lines array
      const driverSnap = await getDoc(driverRef);
      if (driverSnap.exists()) {
        const driverData = driverSnap.data();
        const updatedDriverLines = (driverData.lines || []).filter(line => line.id !== selectedLine.id);
        batch.update(driverRef, {
          lines: updatedDriverLines
        });
      }

      // 3. Update all riders in the line: set driver_id to null
      for (const rider of selectedLine.riders || []) {
        const riderRef = doc(DB, "riders", rider.id);
        batch.update(riderRef, {
          driver_id: null
        });
      }

      await batch.commit();

      // ✅ Update local state (optional)
      setSelectedLine(prev => ({
        ...prev,
        driver_id: null
      }));

      alert("تم إزالة السائق من الخط بنجاح!");
    } catch (error) {
      console.log("Error removing driver from line:", error);
      alert("حدث خطأ أثناء إزالة السائق.");
    } finally {
      setIsDeletingDriverFromLine(false);
    }
  }

  //Fetch driver data
  const findDriverInfoFromId = (driverID) => {
    const theDriver = drivers.find((driver) => driver.id === driverID)
    if(!theDriver) {
      console.log('driver didnt exsit')
      return null;
    }
    return {
      name: theDriver.full_name,
      family_name: theDriver.family_name,
      car_type:theDriver.car_type,
      id:theDriver.id,
      dailyTracking:theDriver.dailyTracking
    }
  }

  const driver = findDriverInfoFromId(selectedLine?.driver_id)
  const isToday = historyDate?.isSame(today, "day")
  const isCurrentMonth = historyDate?.isSame(today, "month") && historyDate?.isSame(today, "year")

  // Navigation days handler
  const changeDay = (amount) => {
    const newDate = historyDate.add(amount, "day");
    if (amount > 0 && newDate.isAfter(today)) return;
    setHistoryDate(newDate.startOf("day"))
  }

  // Navigation months handler
  const changeMonth = (amount) => {
    const newMonth = historyDate.add(amount, "month");
    if (amount > 0 && isCurrentMonth) return;
    const lastDayOfMonth = newMonth.daysInMonth();
    if (historyDate.date() > lastDayOfMonth) {
      setHistoryDate(newMonth.date(lastDayOfMonth).startOf("day"))
    } else {
      setHistoryDate(newMonth.startOf("day"))
    }
  }

  // Function to load line history from driver.dailyTracking
  const loadDriverLineHistory = (line, date) => {
    if (!driver) return null;

    const iraqNow = date.tz("Asia/Baghdad").startOf("day")
    const yearMonthKey = `${iraqNow.year()}-${String(iraqNow.month() + 1).padStart(2, "0")}`;
    const dayKey = String(iraqNow.date()).padStart(2, "0");

    const trackingDay = driver?.dailyTracking?.[yearMonthKey]?.[dayKey] || null;
    let foundLine = null;

    if (trackingDay?.today_lines){
      foundLine = trackingDay.today_lines.find(l => l.id === line.id) || null;
    }
    return foundLine;
  };

  useEffect(() => {
    if (driver && selectedLine) {
      const history = loadDriverLineHistory(selectedLine, historyDate);
      setLineHistory(history);
    }
  }, [driver,selectedLine,historyDate]);

  //Copy day start and time to all table days
  const copyFirstDayToAll = () => {
    // find the first day that has both start and end time
    const firstDay = schoolTimetable.find(
      (d) => d.startTime && d.endTime
    );
    if (!firstDay) return;

    setSchoolTimetable((prev) =>
      prev.map((item) => {
        // skip Friday (5) and Saturday (6)
        if (item.dayIndex === 5 || item.dayIndex === 6) return item;

        return {
          ...item,
          active: true,
          startTime: firstDay.startTime,
          endTime: firstDay.endTime,
        };
      })
    );
  };

  //Close line daily details modal
  const handleCloseLineDailyDetailsModal = () => {
    setOpenLineDailyDetailsModal(false)
    setHistoryDate(dayjs().utcOffset(180))
    setSelectedPhase('first')
  }

  if(isDeletingDriverFromLine || isDeletingRiderFromLine || fetchingInstitutions) {
    return(
      <div style={{ width:'70vw',height:'70vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <ClipLoader
          color={'#955BFE'}
          loading={isDeletingDriverFromLine || isDeletingRiderFromLine || fetchingInstitutions}
          size={70}
          aria-label="Loading Spinner"
          data-testid="loader"
        />
      </div>
    )
  }

  const renderAddNewLineSection = () => (
    <div className='toggle-between-school-company-container' style={{border:'none'}}>
      <div className='students-section-inner-title'>
        <input
          placeholder='رمز الخط'
          type='text'
          value={lineIDFilter}
          onChange={(e) => setLineIDFilter(e.target.value)}
          style={{width:'250px',fontSize:'15px'}}
        />
      </div>
      {schoolControlType && (
      <div className='students-section-inner-title'>
        <button
          onClick={handleOpenCreateNewLineModal}
          className='confirm-edit-time-table-button'
          style={{width:'130px'}}
        >
          انشاء خط جديد
        </button>
        <Modal
          title='انشاء خط جديد'
          open={openAddingNewLineModal}
          onCancel={handleCloseCreateNewLineModal}
          centered
          footer={null}
        >
          <div className='creating-new-line-modal'>
            <div className='creating-new-line-form' style={{marginTop:'30px'}}>

              <div className='students-section-inner-title'>
                <div className='school_user_name'>
                  <h5>{schoolUserName}</h5>
                </div>
              </div>
             
              <div className='students-section-inner-title'>
                <select 
                  onChange={handleLineCarTypeChange}
                  value={lineCarType}
                  style={{width:'250px'}}                
                >
                  <option value=''>نوع السيارة</option>
                  <option value='صالون'>صالون</option>
                  <option value='ميني باص ١٢ راكب'>ميني باص ١٢ راكب</option>
                  <option value='ميني باص ١٨ راكب'>ميني باص ١٨ راكب</option>
                </select>
              </div>

              <div className="students-section-inner-title">
                <select
                  onChange={handleLineAgeRangeChange}
                  value={lineAgeRangeFilter}
                  style={{ width: "250px" }}
                >
                  <option value="">معدل الاعمار</option>
                  {Object.keys(ageRanges).map((label, i) => (
                    <option key={i} value={label}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className='students-section-inner-title' style={{gap:'20px'}}>
                <input
                  type='number'
                  onChange={handleLineSeatsNumber}
                  value={lineSeatsNumber}
                  style={{width:'100px'}}
                />
                <label>عدد المقاعد</label>
              </div>

              <div className="creating-new-line-form-timing">
                {schoolTimetable.map((dayTime) => (
                  <div key={dayTime.dayIndex} className="creating-new-line-form-timing-box">
                    <input
                      type="checkbox"
                      checked={dayTime.active}
                      onChange={() => toggleDayActive(dayTime.dayIndex)}
                    />
                    <h5 style={{ width: "50px", textAlign: "center" }}>{dayTime.day}</h5>      
                    <div style={{ width: "70px" }}>
                      <input
                        type="time"
                        value={dateToTimeString(dayTime.startTime)}
                        onChange={(e) => handleTimeChange(dayTime.dayIndex, "startTime", e.target.value)}
                        disabled={!dayTime.active}
                      />
                    </div>
                    <div style={{ width: "70px" }}>
                      <input
                        type="time"
                        value={dateToTimeString(dayTime.endTime)}
                        onChange={(e) => handleTimeChange(dayTime.dayIndex, "endTime", e.target.value)}
                        disabled={!dayTime.active}
                      />
                    </div>
                    <div className='copy-day-timing-to-table'>
                    {dayTime.dayIndex === 0 && dayTime.startTime && dayTime.endTime && (
                      <button
                        type="button"
                        onClick={copyFirstDayToAll}
                        style={{ marginLeft: "10px" }}
                      >
                        نسخ
                      </button>
                    )}
                    </div>
                  </div>
                ))}
              </div>

              <div className='students-section-inner-title' style={{height:'25px',marginTop:'10px',flexDirection:'row-reverse',gap:'10px'}}>
                <h5>الاشتراك الشهري</h5>
                <input
                  type='text'
                  onChange={handleLineDriverSubsAmount}
                  value={formatNumberWithCommas(lineSubsAmount)}
                  style={{width:'150px'}}
                />
              </div>
              
              {addingNewLineLoading ? (
                <div className='confirm-edit-time-table-button' style={{marginTop:'5px'}}>
                  <ClipLoader
                    color={'#fff'}
                    loading={addingNewLineLoading}
                    size={10}
                    aria-label="Loading Spinner"
                    data-testid="loader"
                  />
                </div>
              ) : (
                <button
                  onClick={createNewLineHandler}
                  disabled={addingNewLineLoading}
                  className='confirm-edit-time-table-button'
                  style={{marginTop:'10px'}}
                >
                  انشاء
                </button>  
              )}   
            </div>
          </div>
        </Modal>
      </div>
      )}
    </div>
  ) 

  const renderLinesTitles = () => (
    <div className='students-section-inner-titles'>
      <div className='students-section-inner-title' style={{width:'450px'}}>
        <input 
          onChange={handleDriverNameChange} 
          name='line_name'
          value={lineDriverNameFilter}
          placeholder='السائق' 
          type='text' 
          style={{width:'250px'}}
        />
      </div>
      <div className='students-section-inner-title' style={{width:'300px'}}>
        <div className='driver-rating-box' style={{width:'150px'}}>
          <button onClick={handleSortByLowestRiders}>
            <FaCaretDown 
              size={18} 
              className={ridersSortDirection === 'asc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}
            />
          </button>
          <h5>عدد الركاب</h5>
          <button onClick={handleSortByHighestRiders}>
            <FaCaretUp 
              size={18}
              className={ridersSortDirection === 'desc' ? 'driver-rating-box-icon-active':'driver-rating-box-icon'}
            />
          </button>
        </div>
      </div>
      <div className='students-section-inner-title' style={{width:'300px'}}>
        <select onChange={handleHasDriverChange} value={hasDriverFilter}>
        <option value=''>لديه سائق</option>
          <option value={true}>نعم</option>
          <option value={false}>لا</option>
        </select>
      </div>
    </div>
  )

  return (
    <div className='white_card-section-container'>
      {!selectedLine ? (
        <div className='students-section-inner'>
          {renderAddNewLineSection()}
          {renderLinesTitles()}
          <div className='all-items-list'>
            {sortedLines.map((line, index) => {
              const driver = drivers.find((d) => d.id === line.driver_id);
              return (
                <div key={index} onClick={() => setSelectedLine(line)} className='single-item'>
                  <div style={{width:'450px'}}>
                    {driver ? (
                      <h5>
                        {driver?.full_name} {driver?.family_name}
                      </h5>
                    ) : (
                      <h5>--</h5>
                    )}
                  </div>
                  <div style={{width:'300px'}}>
                    <h5>{line.riders.length}</h5>
                  </div>
                  <div style={{width:'300px'}}>
                    <h5 className={line.driver_id ? 'student-has-driver' : 'student-without-driver'}>{line.driver_id ? 'نعم' : 'لا'}</h5>
                  </div>           
              </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="item-detailed-data-container">
          <div className='item-detailed-data-header'>
            <div className='item-detailed-data-header-title' style={{gap:'7px'}}>
              {selectedLine.driver_id && (
                <>
                  <div className='line-daily-details-button' onClick={() => setOpenLineDailyDetailsModal(true)}>
                    <h5>التفاصيل اليومية</h5> 
                  </div>
                  <Modal
                    title='تفاصيل الخط اليومية'
                    open={openLineDailyDetailsModal}
                    onCancel={handleCloseLineDailyDetailsModal}
                    centered
                    footer={null}
                  >
                    <div className='creating-new-line-modal'>
                      <div className='creating-new-line-form' style={{marginTop:'10px'}}>

                        {/* Driver Info */} 
                        <div className='driver-line-history-box' 
                          style={{flexDirection:'row-reverse',height:'50px',width:'400px',border:'1px solid #ddd',borderRadius:'10px'}}
                        >
                          <h5 style={{fontWeight:'400',marginLeft:'5px'}}>السائق</h5>
                          <h5>{driver.name} {driver.family_name}</h5>
                          <h5>-</h5>
                          <h5>{driver.id}</h5>
                        </div>

                        {/* Date Picker */}
                        <div className='driver-line-history-box'>
                          <div 
                            onClick={() => changeMonth(-1)} 
                            className='driver-line-history-date-switch-button'
                          >
                            <PiCaretDoubleLeftFill color='#fff' size={16}/>
                          </div>
                          <div 
                            onClick={() => changeDay(-1)} 
                            className='driver-line-history-date-switch-button'
                          >
                            <BiSolidLeftArrow color='#fff' size={16}/>
                          </div>
                          <div className='driver-line-history-date-day-box'>
                            <DatePicker
                              locale={locale}
                              value={historyDate}
                              format={(date) => 
                                //date ? date.locale("ar").format("dddd، DD MMMM YYYY") : ""
                                date ? date.tz("Asia/Baghdad").locale("ar").format("dddd، DD MMMM YYYY") : ""
                              }
                              onChange={(date) => {
                                if (date && !date.isAfter(today)) {
                                  const normalized = dayjs(date).tz("Asia/Baghdad").startOf("day");
                                  setHistoryDate(normalized);
                                  //setHistoryDate(date.utcOffset(180));
                                }
                              }}
                              disabledDate={(current) => current && current > today}
                              allowClear={false}
                            />
                          </div>
                          <div 
                            onClick={() => changeDay(1)} 
                            disabled={isToday} 
                            className='driver-line-history-date-switch-button'
                          >
                            <BiSolidRightArrow color='#fff' size={16}/>
                          </div>
                          <div 
                            onClick={() => changeMonth(1)} 
                            disabled={isCurrentMonth} 
                            className='driver-line-history-date-switch-button'
                          >
                            <PiCaretDoubleRightFill color='#fff' size={16}/>
                          </div>
                        </div>

                        {/* Phase Switcher */}
                        <div className='driver-line-history-box' style={{gap:'25px',flexDirection:'row-reverse'}}>
                          <div
                            className={selectedPhase === "first" ? "driver-line-history-box-phase-btn-active" : "driver-line-history-box-phase-btn"}
                            onClick={() => setSelectedPhase("first")}
                          >
                            <h5
                              className={selectedPhase === "first" ? "driver-line-history-box-phase-btn-text-active" : "driver-line-history-box-phase-btn-text"}
                            >رحلة الذهاب</h5>                           
                          </div>
                          <div
                            className={selectedPhase === "second" ? "driver-line-history-box-phase-btn-active" : "driver-line-history-box-phase-btn"}
                            onClick={() => setSelectedPhase("second")}
                          >
                            <h5
                              className={selectedPhase === "second" ? "driver-line-history-box-phase-btn-text-active" : "driver-line-history-box-phase-btn-text"}
                            >رحلة العودة</h5>    
                          </div>
                        </div>

                        {/* History Info */}
                        {lineHistory ? (
                          <div className='driver-line-history-main-box'>

                            <div className='driver-line-history-main-box-start-trip-timing'>
                              <h5>بداية الرحلة</h5>
                              <h5>
                                {selectedPhase === "first"
                                  ? lineHistory?.first_phase?.phase_starting_time || "--"
                                  : lineHistory?.second_phase?.phase_starting_time || "--"}
                              </h5>
                            </div>

                            <div className='driver-line-history-main-box-start-trip-riders'>
                              <div className='driver-line-history-main-box-start-trip-riders-header'>
                                <h5>الراكب</h5>
                                <h5>{selectedPhase === "first" ? 'صعود' : 'نزول'}</h5>
                              </div>
                              <div className='driver-line-history-main-box-start-trip-riders-list'>
                                {(selectedPhase === "first"
                                  ? lineHistory?.first_phase?.riders || []
                                  : lineHistory?.second_phase?.riders || []
                                ).map((r) => (
                                  <div 
                                    key={r.id} 
                                    className='driver-line-history-main-box-start-trip-riders-header' 
                                    style={{marginBottom:'1px',backgroundColor:'#efeff0ff'}}
                                  >
                                    <h5>
                                      {r.name} {r.family_name}
                                    </h5>
                                    <h5>
                                      {selectedPhase === "first" ? r.picked_up_time || "--" : r.dropped_off_time || "--"}
                                    </h5>
                                  </div>
                                ))}
                              </div>
                            </div>


                            {/* End of phase */}
                            {selectedPhase === "first" ? (
                              <div className='driver-line-history-main-box-start-trip-timing'>
                                <h5>الوصول للوجهة</h5>
                                <h5>{lineHistory?.first_phase?.phase_finishing_time || '--'}</h5>
                              </div>
                            ) : (
                              <div className='driver-line-history-main-box-start-trip-timing'>

                              </div>
                            )}
                          </div>
                        ) : (
                          <div className='driver-line-history-main-box' style={{height:'200px',justifyContent:'center'}}>
                            <p>لا يوجد بيانات لهذا اليوم</p>
                          </div>                         
                        )}
                      </div>
                    </div>
                  </Modal> 
                  <h5>-</h5>
                </> 
              )}           
              <h5>{selectedLine.id}</h5>
              <h5>-</h5>
              <h5>{selectedLine.name || '-'}</h5>
            </div>
            <button className="info-details-back-button" onClick={goBack}>
              <BsArrowLeftShort size={24}/>
            </button>
          </div>
          <div className="item-detailed-data-main">
            <div className="item-detailed-data-main-firstBox" style={{justifyContent:'center',gap:'10px'}}>
              <div className='line-manage-buttons'>
                <h5>الفئة العمرية</h5>
                <h5 style={{fontWeight:'bold'}}>{formatAgeRangeText(selectedLine?.age_range)}</h5>
              </div>
              <div className='line-manage-buttons' style={{height:'40px',marginBottom:'5px'}}>
                <div className='line-subs-amount-item'>
                  <div className='line-subs-amount-item-text'>
                    <h5>الاشتراك الشهري</h5>
                    {editingLineDriverAmount ? (
                      <input
                        type='number'
                        value={newDriverAmount ?? selectedLine?.standard_driver_commission}
                        onChange={(e) => setNewDriverAmount(e.target.value)}
                      />
                    ) : (
                      <h5 style={{fontWeight:'bold'}}>
                        {formatAccountBalanceFee(selectedLine?.standard_driver_commission)}
                      </h5>
                    )}                    
                  </div> 
                  {schoolControlType && (
                  <>
                  {editingLineDriverAmount ? (
                    <div className='line-subs-amount-item-edit-btn'>
                      <button
                        className="assinged-item-item-delete-button" 
                        style={{width:'20px',height:'20px'}}
                        onClick={() => setEditingLineDriverAmount(false)}
                      >
                        <IoClose size={16}/>  
                      </button>
                    </div>
                  ) : (
                    <div className='line-subs-amount-item-edit-btn'>
                      <button
                        className="assinged-item-item-delete-button" 
                        style={{width:'20px',height:'20px'}}
                        onClick={() => setEditingLineDriverAmount(true)}
                      >
                        <FiEdit2 size={15}/> 
                      </button>
                    </div>
                  )}
                  </>
                  )}          
                </div>
                {schoolControlType && (
                <>
                {(editingLineDriverAmount) && (
                  <div>
                    {updatingAmountLoading ? (
                      <div className='add-rider-to-line-button' style={{width:'50px'}}>
                        <ClipLoader
                          color={'#fff'}
                          loading={updatingAmountLoading}
                          size={10}
                          aria-label="Loading Spinner"
                          data-testid="loader"
                        />
                      </div>
                    ) : (
                      <button
                        className='add-rider-to-line-button'
                        style={{width:'50px'}}
                        onClick={handleUpdateSubsAmount}
                        disabled={updatingAmountLoading}
                      >
                        تحديث
                      </button>
                    )}
                  </div>
                )}
                </>
                )}
              </div>
              <div className="item-detailed-data-main-firstBox-line-students" style={{height:'40vh'}}>
                  {selectedLine?.riders?.length ? (
                    <>
                      {selectedLine.riders.map((rider) => (
                        <div key={rider.id} className='line-dropdown-item'>
                          <div>
                            <div>
                              <h5>{rider.name} {rider.family_name}</h5>
                              <h5>-</h5>
                              <h5>{rider.birth_date ? calculateAge(rider.birth_date) : '-'}</h5>
                              <h5>سنة</h5>
                              <h5>-</h5>
                              <h5>{rider.id}</h5>
                            </div>
                            <div>
                              <h5>{rider.home_address}</h5>
                            </div>
                          </div>   
                          {schoolControlType && (
                            <button 
                              className="assinged-item-item-delete-button" 
                              onClick={() => deleteRiderFromLineHandler(rider.id)}
                              disabled={isDeletingRiderFromLine}
                            >
                              <FcCancel size={24} />
                            </button>
                          )}                                             
                        </div>                               
                      ))}
                    </>
                  ) : (
                    <h5 className="no-students">لا يوجد طلاب في هذا الخط</h5>
                  )}
              </div>
              {schoolControlType  && (
              <div className='line-manage-buttons'>
                <button className='add-new-rider-to-line-btn' onClick={handleOpenMapModal}>
                  <h5>اضافة راكب</h5>
                  <FcPlus size={22}/>
                </button>
              </div>
              )}
              <Modal
                title={[
                  <div className='map-add-new-rider-to-line-modal' key='add-rider'>
                    <div>
                      <p>اضافة راكب</p>
                    </div>
                    <div>
                      <div className='map-add-new-rider-to-line-modal-item'>
                        <div className='map-add-new-rider-to-line-modal-dot'></div>
                        <div className='map-add-new-rider-to-line-modal-text'>
                          <h5>الركاب المتواجدين في الخط</h5>
                          <h5 style={{fontWeight:'bold'}}>{selectedLine?.riders.length}</h5>
                        </div>                       
                      </div>                      
                      <div className='map-add-new-rider-to-line-modal-item'>
                        <div className='map-add-new-rider-to-line-modal-dot' style={{backgroundColor:'tomato'}}></div>
                        <div className='map-add-new-rider-to-line-modal-text'>
                          <h5>ركاب يمكن اضافتهم للخط</h5>
                          <h5 style={{fontWeight:'bold'}}>{eligibleRiders?.length}</h5>
                        </div>                     
                      </div>                    
                    </div>                    
                  </div>
                  ]}
                open={isModalMapVisible}
                onCancel={handleCloseMapModal}
                centered
                width={850}
                footer={null}
              >
                <div style={{ height: '500px', width:'800px',margin:'0px'}}>
                  <GoogleMap
                    mapContainerStyle={containerStyle}
                    onLoad={handleMapLoad}
                    center={allLineCoordinates[0] || { lat: 0, lng: 0 }}
                    zoom={12}
                  >

                    {/* Destination marker */}
                    <Marker
                      position={{
                        lat: selectedLine?.destination_location?.latitude,
                        lng: selectedLine?.destination_location?.longitude,
                      }}
                      icon={{
                        url: "/icons/school.png",
                        scaledSize: new window.google.maps.Size(30, 30), // resize marker
                      }}
                    />

                    {/* Riders already in the line (blue markers) */}
                    {selectedLine?.riders?.map((rider) => (
                      <Marker
                        key={rider?.id}
                        position={{
                          lat: rider?.home_location?.latitude,
                          lng: rider?.home_location?.longitude,
                        }}
                        icon={{
                          url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                        }}
                        onClick={() => setSelectedRider(rider)}
                      />
                    ))}

                    {/* Eligible riders as red markers */}
                    {eligibleRiders.map((rider) => (
                      <Marker
                        key={rider?.user_doc_id}
                        position={{
                          lat: rider?.home_location?.latitude,
                          lng: rider?.home_location?.longitude,
                        }}
                        icon={{
                          url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                        }}
                        onClick={() => setSelectedRider(rider)}
                      />
                    ))}

                    {/* Show rider info on marker click */}
                    {selectedRider && (
                      <InfoWindow
                        position={{
                          lat: selectedRider.home_location.latitude,
                          lng: selectedRider.home_location.longitude,
                        }}
                        onCloseClick={() => setSelectedRider(null)}
                      >
                        <div className='marker-info-modal-box'>
                          <div>
                            <h4>{selectedRider.full_name || selectedRider.name}</h4>
                            <h4>{selectedRider.family_name}</h4>
                          </div>
                          <div>
                            <h4 style={{fontSize:'12px'}}>{selectedRider.id}</h4>
                          </div>
                          {selectedRider?.line_id === null && (
                            <div>
                              {addingRiderToLine ? (
                                <div className='add-rider-to-line-button'>
                                  <ClipLoader
                                    color={'#fff'}
                                    loading={addingRiderToLine}
                                    size={10}
                                    aria-label="Loading Spinner"
                                    data-testid="loader"
                                  />
                                </div>
                              ) : (
                                <button
                                  className='add-rider-to-line-button'
                                  onClick={() => addRiderToLine(selectedRider)}
                                  disabled={addingRiderToLine}
                                >
                                  أضف
                                </button>
                              )}
                            </div>   
                          )}                                           
                        </div>
                      </InfoWindow>
                    )}

                  </GoogleMap>
                </div>
              </Modal>
            </div>
            <div className="item-detailed-data-main-second-box">
              <div className="line-dropdown-item" style={{width:'380px'}}>
                {selectedLine.driver_id ? (
                  (() => {
                    const driver = findDriverInfoFromId(selectedLine.driver_id)
                    const transferredTo = selectedLine?.transferredTo || null

                    // check if we're inside the transfer period
                    const now = new Date();
                    const isWithinTransfer = transferredTo && transferredTo?.startDate?.toDate() <= now && now <= transferredTo?.endDate?.toDate();

                      return driver ? (
                        <>
                          {/* Original driver box */}
                          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                            <div>
                              <h5 style={{fontWeight:'bold'}}>السائق</h5>
                              <h5>{driver.name} {driver.family_name}</h5>
                              <h5>-</h5>
                              <h5>{driver.car_type}</h5>
                            </div>
                            <div>
                              <h5>{driver.id}</h5>
                            </div>                           
                          </div>
                          {!isWithinTransfer && schoolControlType && (
                            <>
                              {selectedLine.riders.length > 0 ? (
                                <>
                                  <button
                                    className="assinged-item-item-delete-button" 
                                    onClick={() => openSwitchLineModal(selectedLine)}
                                  >
                                    <Image 
                                      src={switchLine} 
                                      style={{ objectFit: 'cover' }}  
                                      width={18}
                                      height={18}
                                      alt='switch line'
                                    />
                                  </button>
                                  <Modal
                                    title={'تحويل الخط لسائق اخر'}
                                    open={isOpeningSwitchLineModal}
                                    onCancel={handleCloseSwitchLineModal}
                                    centered
                                    footer={null}
                                  >
                                    <div className='switch-line-info-conainer'>
                                      <div>
                                        <p style={{ fontWeight: 'bold' }}>{selectedLine?.name}</p>
                                      </div>

                                      {/* Select substitute driver */}
                                      <div className='swicth_line_driver_select'>
                                        <select onChange={switchDriverChangeHandler} value={switchDriver.id}>
                                          <option value=''>السائق البديل</option>
                                          {drivers
                                            .filter(driver => driver?.service_type === 'خطوط')
                                            .filter(driver => driver?.id !== selectedLine?.driver_id)
                                            .map(driver => (
                                              <option key={driver?.id} value={driver?.id}>
                                                {driver?.id} - {driver?.full_name} {driver?.family_name}
                                              </option>
                                            ))}
                                        </select>
                                      </div>

                                      {/* Select substitution type permanente or determined periode */}
                                      <div className="switch-line-mode-toggle">
                                        <div>
                                          <input
                                            type="radio"
                                            value="determinedPeriode"
                                            checked={transferType === 'determinedPeriode'}
                                            onChange={() => setTransferType('determinedPeriode')}
                                          />
                                          <h5>لفترة محددة</h5>
                                        </div>
                                        <div>
                                          <input
                                            type="radio"
                                            value="permanente"
                                            checked={transferType === 'permanente'}
                                            onChange={() => setTransferType('permanente')}
                                          />
                                          <h5>بشكل دائم</h5>
                                        </div>
                                      </div>

                                      {transferType === 'determinedPeriode' && (
                                        <div className="switch-line-mode-toggle">
                                          <div>
                                            <input
                                              type="radio"
                                              value="today"
                                              checked={transferPeriode === 'today'}
                                              onChange={() => setTransferPeriode('today')}
                                            />
                                            <h5>اليوم</h5>
                                          </div>
                                          <div>
                                            <input
                                              type="radio"
                                              value="future"
                                              checked={transferPeriode === 'future'}
                                              onChange={() => setTransferPeriode('future')}
                                            />
                                            <h5>تحديد تاريخ مستقبلي</h5>
                                          </div>
                                        </div>
                                      )}

                                       {/* Transfer for Today */}
                                      {transferType === 'determinedPeriode' && transferPeriode === 'today' && (
                                        <div className="switch-line-mode-toggle">
                                          <div>
                                            <input
                                              type="checkbox"
                                              checked={tripPhases.first}
                                              onChange={() =>
                                                setTripPhases(prev => ({ ...prev, first: !prev.first }))
                                              }
                                            />
                                            <h5>رحلة الذهاب</h5>
                                          </div>
                                          <div>
                                            <input
                                              type="checkbox"
                                              checked={tripPhases.second}
                                              onChange={() =>
                                                setTripPhases(prev => ({ ...prev, second: !prev.second }))
                                              }
                                              style={{ marginRight: '10px' }}
                                            />
                                            <h5>رحلة العودة</h5>
                                          </div>
                                        </div>
                                      )}

                                      {transferType === 'determinedPeriode' && transferPeriode === 'future' && (
                                        <>
                                          <div className='swicth_line_periode_date'>
                                            <h5>تاريخ البداية</h5>
                                            <input
                                              type="date"
                                              value={switchLineStartDate}
                                              onChange={handleSwitchLineStartDate}
                                              min={getTomorrowDateString()} // disables today and earlier
                                            />
                                          </div>

                                          <div className='swicth_line_periode_date'>
                                            <h5>تاريخ النهاية</h5>
                                            <input
                                              type="date"
                                              value={switchLineEndDate}
                                              onChange={handleSwitchLineEndDate}
                                              min={switchLineStartDate || getTomorrowDateString()}
                                            />
                                          </div>
                                        </>
                                      )}   
                                         
                                      {/* Submit Button */}
                                      {isTransferringLine ? (
                                        <div style={{ width: '100px', height: '30px', backgroundColor: '#955BFE', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                          <ClipLoader
                                            color={'#fff'}
                                            loading={isTransferringLine}
                                            size={13}
                                            aria-label="Loading Spinner"
                                            data-testid="loader"
                                          />
                                        </div>
                                      ) : (
                                        <button
                                          onClick={handleTransferLineToDriverB}
                                          className="assign-switch-line-button"
                                        >
                                          تأكيد
                                        </button>
                                      )}
                                    </div>
                                  </Modal>
                                </>
                              ) : (
                                <>
                                {schoolControlType && (
                                <button 
                                  className="assinged-item-item-delete-button" 
                                  onClick={() => deleteDriverFromLineHandler()}
                                  disabled={isDeletingDriverFromLine}
                                >
                                  <FcCancel size={24} />
                                </button>
                                )}
                                </>
                              )}
                            </>
                          )}                        
                        </>                                      
                      ) : (
                      <h5>--</h5>
                    )
                  })()
                ) : (
                  <>
                  {schoolControlType ? (
                  <div className='line-manage-buttons' style={{width:'100%'}}>
                    <button className='add-new-rider-to-line-btn' onClick={handleOpenMapModalDrivers}>
                      <h5>ربط الخط بسائق</h5>
                      <FcPlus size={22}/>
                    </button>
                  </div>
                  ) : (
                    <div className='line-manage-buttons' style={{width:'100%'}}>
                      <h5>لا يوجد سائق</h5>
                    </div>
                  )}
                  <Modal
                    title={[
                      <div className='map-add-new-rider-to-line-modal' key='add-rider'>
                        <div>
                          <p>ربط الخط بسائق</p>
                        </div>
                        <div>
                          <div className='map-add-new-rider-to-line-modal-item'>
                          <div className='map-add-new-rider-to-line-modal-dot'></div>
                            <div className='map-add-new-rider-to-line-modal-text'>
                              <h5>الركاب المتواجدين في الخط</h5>
                              <h5 style={{fontWeight:'bold'}}>{selectedLine?.riders.length}</h5>
                            </div>                       
                          </div>                                         
                        </div>                   
                      </div>
                    ]}
                    open={isModalMapVisibleDriver}
                    onCancel={handleCloseMapModalDrivers}
                    centered
                    width={850}
                    footer={null}
                  >
                    <div style={{ height: '500px', width:'800px',margin:'0px'}}>
                      <GoogleMap
                        mapContainerStyle={containerStyle}
                        onLoad={handleMapLoad}
                        center={allLineCoordinates[0] || { lat: 0, lng: 0 }}
                        zoom={12}
                      >

                        {/* Destination marker */}
                        <Marker
                          position={{
                            lat: selectedLine?.destination_location?.latitude,
                            lng: selectedLine?.destination_location?.longitude,
                          }}
                          icon={{
                            url: "/icons/school.png",
                            scaledSize: new window.google.maps.Size(30, 30), // resize marker
                          }}
                        />

                        {/* Riders already in the line (blue markers) */}
                        {selectedLine?.riders?.map((rider) => (
                          <Marker
                            key={rider?.id}
                            position={{
                              lat: rider?.home_location?.latitude,
                              lng: rider?.home_location?.longitude,
                            }}
                            icon={{
                              url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                            }}
                          />
                        ))}

                        {/* Eligible drivers */}
                        {eligibleDrivers.map((driver) => (
                          <Marker
                            key={driver?.user_doc_id}
                            position={{
                              lat: driver?.home_location?.latitude,
                              lng: driver?.home_location?.longitude,
                            }}
                            icon={{
                              url: "/icons/minibus.png",
                              scaledSize: new window.google.maps.Size(30, 30), // resize marker
                            }}
                            onClick={() => setSelectedDriver(driver)}
                          />
                        ))}

                        {/* Show rider info on marker click */}
                        {selectedDriver && (
                          <InfoWindow
                            position={{
                              lat: selectedDriver.home_location.latitude,
                              lng: selectedDriver.home_location.longitude,
                            }}
                            onCloseClick={() => setSelectedDriver(null)}
                          >
                            <div className='marker-info-modal-box'>
                              <div>
                                <h4>{selectedDriver?.full_name}</h4>
                                <h4>{selectedDriver?.family_name}</h4>
                              </div> 
                              <div>
                                <h4 style={{fontSize:'12px'}}>{selectedDriver?.id}</h4>
                              </div>
                              {addingDriverToLine ? (
                                <div className='add-rider-to-line-button'>
                                  <ClipLoader
                                    color={'#fff'}
                                    loading={addingDriverToLine}
                                    size={10}
                                    aria-label="Loading Spinner"
                                    data-testid="loader"
                                  />
                                </div>
                              ) : (
                                <button
                                  className='add-rider-to-line-button'
                                  onClick={() => assignDriver(selectedDriver)}
                                  disabled={addingDriverToLine}
                                >
                                  ربط
                                </button>
                              )}                                          
                            </div>
                          </InfoWindow>
                        )}
                      </GoogleMap>
                    </div>
                  </Modal>
                </>
              )}
              </div>
              
              <>
                {selectedLine?.transferredTo && (
                  (() => {
                    const transferredTo = selectedLine?.transferredTo;
                    const now = new Date();
                    const startDateRaw = transferredTo?.startDate?.toDate() || transferredTo?.startDate;
                    const endDateRaw = transferredTo?.endDate?.toDate() || transferredTo?.endDate;

                    // Format as dd/mm/yyyy
                    const formatDate = (date) => {
                      if (!date) return "";
                      return new Date(date).toLocaleDateString("en-GB"); 
                    };

                    const startDate = formatDate(startDateRaw);
                    const endDate = formatDate(endDateRaw);

                    const isWithinTransfer = startDateRaw && endDateRaw && startDateRaw <= now && now <= endDateRaw;
                    const subsDriver = findDriverInfoFromId(transferredTo?.subs_driver);
                    return isWithinTransfer && (
                      <div className="line-dropdown-item" style={{ width: "370px",flexDirection:'column',justifyContent:'center',gap:'3px' }}>
                        <div style={{width:'100%',display:'flex',flexDirection:'row-reverse',justifyContent:'center',alignItems:'center',gap:'5px'}}>                          
                          <h5>تم نقل هذا الخط الى السائق *</h5>
                          <h5 style={{fontWeight:'bold'}}>{subsDriver.name}</h5>
                          <h5 style={{fontWeight:'bold'}}>{subsDriver.family_name}</h5>
                        </div>
                        <div>
                          <h5>{subsDriver.id}</h5>
                        </div>
                        <div style={{width:'100%',display:'flex',flexDirection:'row-reverse',justifyContent:'center',alignItems:'center',gap:'5px'}}>
                          <h5>ابتداء من</h5>
                          <h5 style={{fontWeight:'bold'}}>{startDate}</h5>
                          <h5>الى غاية</h5>
                          <h5 style={{fontWeight:'bold'}}>{endDate}</h5>
                        </div>                      
                      </div>
                    )
                  })()
                )}
              </>
            
              <div className="item-detailed-data-main-second-box-line">
                <div className="line-time-table" style={{marginTop:'10px',marginBottom:'10px'}}>
                  <table>
                    <thead>
                      <tr> 
                        <th style={{width:'70px',padding:'4px'}}>
                          <h5>تعديل</h5>  
                        </th>                                                            
                        <th style={{padding:'4px'}}>
                          <h5>نهاية الدوام</h5>
                        </th>
                        <th style={{padding:'4px'}}>
                          <h5>بداية الدوام</h5>
                        </th>
                        <th style={{padding:'4px'}}>
                          <h5>اليوم</h5>
                        </th>                                        
                      </tr>
                    </thead>
                    <tbody>
                      {selectedLine?.timeTable?.map((day, index) => (
                        <tr key={index}>
                          <td style={{width:'70px',padding:'4px'}}>   
                            {isEditing[index] ? (
                              <div style={{width:'70px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <button
                                  className="assinged-item-item-delete-button" 
                                  style={{width:'20px',height:'20px'}}
                                  onClick={() => setIsEditing({})}
                                >
                                  <IoClose size={16}/>
                                </button>
                              </div>
                            ) : (
                              <div style={{width:'70px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <button
                                  className="assinged-item-item-delete-button" 
                                  style={{width:'25px',height:'25px'}}
                                  onClick={() => handleEditClick(index,day.startTime,day.endTime)}
                                >
                                  <FiEdit2 size={15}/> 
                                </button>
                              </div>
                            )}                                                                                                                       
                          </td>   
                          <td style={{padding:'4px'}}>
                            {isEditing[index] ? (
                              <input
                                type="time"
                                value={editingTimes[index]?.endTime || ""}   
                                onChange={(e) => handleEditTimeChange(index, "endTime", e.target.value)}                            
                              />
                            ) : (
                              <h5>{formatTime(day.endTime,day.active)}</h5>
                            )}
                          </td>                                                   
                          <td style={{padding:'4px'}}>
                            {isEditing[index] ? (
                              <input
                                type="time"
                                value={editingTimes[index]?.startTime || ""}
                                onChange={(e) => handleEditTimeChange(index, "startTime", e.target.value)}                               
                              />
                            ) : (
                              <h5>{formatTime(day.startTime,day.active)}</h5>
                            )}
                          </td>                                           
                          <td style={{padding:'4px'}}>
                            <h5>{day.day}</h5>
                          </td>                    
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {Object.values(isEditing).some((v) => v) && (
                    <div className='confirm-edit-time-table'>
                      {savingNewTimeLoading ? (
                        <div className='confirm-edit-time-table-button'>
                          <ClipLoader
                            color={'#fff'}
                            loading={savingNewTimeLoading}
                            size={10}
                            aria-label="Loading Spinner"
                            data-testid="loader"
                          />
                        </div>
                      ) : (
                        <button
                          onClick={handleUpdateLineTimeTable}
                          disabled={savingNewTimeLoading}
                          className='confirm-edit-time-table-button'
                        >
                           تاكيد
                        </button>
                      )}
                      
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Lines