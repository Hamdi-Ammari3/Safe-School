"use client";

import React, { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {useGlobalState} from '../../../globalState';
import { collection,addDoc,getDocs,query,where,updateDoc,doc,arrayRemove,arrayUnion,Timestamp } from "firebase/firestore";
import { DB } from "../../../firebaseConfig";
import {sortClasses} from '../../../lib/sortClasses'
import { Modal } from "antd";
import ClipLoader from "react-spinners/ClipLoader";
import { FiEdit2 } from "react-icons/fi";
import { FaRegTrashCan} from "react-icons/fa6";
import { FaExchangeAlt } from "react-icons/fa";
import "../../style.css";

const getTeacherName = (teachers, id) => {
    return teachers.find(t => t.id === id)?.name || "-";
};

//Format time
const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const TimetableSection = ({ classData, teachers,students }) => {

    const [openAddModal, setOpenAddModal] = useState(false);
    const [openEditModal, setOpenEditModal] = useState(false);
    const [selectedDayIndex, setSelectedDayIndex] = useState(null);
    const [editingSession, setEditingSession] = useState(null);
    const [newSession, setNewSession] = useState({
        subject: "",
        teacher_id: "",
        start: "",
        end: "",
    });
    const [savingNewSession,setSavingNewSession] = useState(false);
    const [savingEditedSession,setSavingEditedSession] = useState(false);
    const [deletingSession, setDeletingSession] = useState(null);

    //Subjects
    const SUBJECTS = [
        "اللغة العربية",
        "اللغة الإنجليزية",
        "الرياضيات",
        "العلوم",
        "الفيزياء",
        "الكيمياء",
        "الأحياء",
        "التاريخ",
        "الجغرافية",
        "التربية الإسلامية",
        "التربية الوطنية",
        "التربية الفنية",
        "التربية الرياضية",
        "الحاسوب",
        "الاقتصاد",
        "علم الاجتماع",
        "الفلسفة",
        "المنطق",
        "اللغة الفرنسية",
    ];

    //Get teacher by subject
    const getTeachersBySubject = (subjectName) => {
        return teachers.filter((teacher) => {
            if (!teacher.subjects) return false;

            return Object.values(teacher.subjects).some(
                (subj) => subj.name === subjectName
            );
        });
    };

    //Open add session modal
    const openAdd = () => {
        setSelectedDayIndex(null);

        setNewSession({
            subject: "",
            teacher_id: "",
            start: "",
            end: "",
        });

        setOpenAddModal(true);
    };

    //Convert time to timestamp
    const toTimestamp = (timeStr) => {
        const [h, m] = timeStr.split(":");

        return Timestamp.fromDate(
            new Date(2000, 0, 1, Number(h), Number(m))
        );
    };

    //Check is subject exist
    const doesSubjectExist = (timetable, subject) => {
        return timetable.some(day =>
            day.sessions.some(s => s.subject === subject)
        );
    };

    //create new conversation for new session
    const createClassSubjectConversationIfNeeded = async ({schoolId,classId,className,subject,teacherId,students}) => {
        const existingSnap = await getDocs(
            query(
                collection(DB, "conversations"),
                where("school_id", "==", schoolId),
                where("class_id", "==", classId),
                where("subject", "==", subject),
                where("scope", "==", "class_subject"),
                where("archived", "==", false)
            )
        );

        if (!existingSnap.empty) return;

        //Fetch students correctly
        const studentsIds = students
            .map((s) => s.id)
            .filter(Boolean);

        const participantIds = Array.from(
            new Set([...studentsIds, teacherId])
        );

        const country = localStorage.getItem("schoolCountry") || "iraq";

        await addDoc(collection(DB, "conversations"), {
            type: "group",
            scope: "class_subject",
            school_id: schoolId,
            class_id: classId,
            class_name: className,
            subject,
            participant_ids: participantIds,
            last_message: "تم بدء المحادثة",
            last_message_at: Timestamp.now(),
            last_message_sender_name: "المدرسة",
            archived: false,
            country,
            created_at: Timestamp.now(),
        });
    };

    //Save new session
    const handleAddSession = async () => {
        try {
            setSavingNewSession(true);

            if (selectedDayIndex === null || selectedDayIndex === "") {
                alert("يرجى اختيار اليوم");
                return;
            }

            if (!newSession.subject || !newSession.teacher_id) {
                alert("يرجى إدخال جميع البيانات");
                return;
            }

            if (!newSession.start || !newSession.end) {
                alert("يرجى تحديد الوقت");
                return;
            }

            const dayIndex = selectedDayIndex;
            const day = classData.timetable[dayIndex];

            const subjectExists = doesSubjectExist(
                classData.timetable,
                newSession.subject
            );

            const session = {
                subject: newSession.subject,
                teacher_id: newSession.teacher_id,
                start: toTimestamp(newSession.start),
                end: toTimestamp(newSession.end),
            };

            const updatedTimetable = [...classData.timetable];

            updatedTimetable[dayIndex] = {
                ...day,
                active: true,
                sessions: [...day.sessions, session],
            };

            // sort by time
            updatedTimetable[dayIndex].sessions.sort(
                (a, b) => a.start.toDate() - b.start.toDate()
            );

            //SAVE CLASS
            await updateDoc(doc(DB, "classes", classData.id), {
                timetable: updatedTimetable,
            });

            // 🔥 UPDATE TEACHER
            const teacher = teachers.find(t => t.id === newSession.teacher_id);

            if (teacher) {
                const subjectKey = Object.keys(teacher.subjects || {}).find(
                    k => teacher.subjects[k].name === newSession.subject
                );

                if (subjectKey) {   
                    await updateDoc(doc(DB, "teachers", teacher.id), {
                        [`subjects.${subjectKey}.class_ids`]: arrayUnion(classData.id),
                    });
                }
            }

            //CREATE CONVERSATION (if first time subject)
            if (!subjectExists) {
                await createClassSubjectConversationIfNeeded({
                    schoolId: classData.schoolId,
                    classId: classData.id,
                    className: classData.name,
                    subject: newSession.subject,
                    teacherId: newSession.teacher_id,
                    students,
                });
            }

            alert("تمت إضافة الحصة");

            setOpenAddModal(false);

        } catch (e) {
            console.error(e);
            alert("فشل إضافة الحصة");
        } finally {
            setSavingNewSession(false)
        }
    };

    //Time input helper
    const formatInputTime = (timestamp) => {
        if (!timestamp) return "";

        const d = timestamp.toDate();
        const h = d.getHours().toString().padStart(2, "0");
        const m = d.getMinutes().toString().padStart(2, "0");

        return `${h}:${m}`;
    };

    //Edit existed session
    const openEdit = (dayIndex, sessionIndex, session) => {
        setEditingSession({dayIndex,sessionIndex,});

        setSelectedDayIndex(dayIndex);

        setNewSession({
            subject: session.subject,
            teacher_id: session.teacher_id,
            start: formatInputTime(session.start),
            end: formatInputTime(session.end),
        });

        setOpenEditModal(true);
    };

    //Save edited session
    const handleEditSession = async () => {
        try {
            setSavingEditedSession(true);
            const { dayIndex, sessionIndex } = editingSession;

            const updatedTimetable = [...classData.timetable];

            updatedTimetable[dayIndex].sessions[sessionIndex] = {
                subject: newSession.subject,
                teacher_id: newSession.teacher_id,
                start: toTimestamp(newSession.start),
                end: toTimestamp(newSession.end),
            };

            //ALWAYS SORT
            updatedTimetable[dayIndex].sessions.sort(
                (a, b) => a.start.toDate() - b.start.toDate()
            );

            await updateDoc(doc(DB, "classes", classData.id), {
                timetable: updatedTimetable,
            });

            alert("تم التعديل بنجاح");

            setOpenEditModal(false);
            setEditingSession(null);

        } catch (e) {
            console.error(e);
            alert("فشل التعديل");
        } finally {
            setSavingEditedSession(false);
        }
    };

    // Count how many times a subject exists in timetable
    const countSubjectOccurrences = (timetable, subject) => {
        let count = 0;

        timetable.forEach(day => {
            day.sessions.forEach(s => {
                if (s.subject === subject) count++;
            });
        });

        return count;
    };

    // Count teacher sessions for this subject in this class
    const countTeacherSubjectOccurrences = (timetable, teacherId, subject) => {
        let count = 0;

        timetable.forEach(day => {
            day.sessions.forEach(s => {
                if (s.teacher_id === teacherId && s.subject === subject) {
                    count++;
                }
            });
        });

        return count;
    };

    // Archive conversation
    const archiveClassSubjectConversation = async ({ schoolId, classId, subject }) => {
        const snap = await getDocs(
            query(
                collection(DB, "conversations"),
                where("school_id", "==", schoolId),
                where("class_id", "==", classId),
                where("subject", "==", subject),
                where("scope", "==", "class_subject"),
                where("archived", "==", false)
            )
        );

        if (snap.empty) return;

        await Promise.all(
            snap.docs.map(d =>
                updateDoc(doc(DB, "conversations", d.id), {
                    archived: true,
                })
            )
        );
    };

    //Delete session
    const handleDeleteSession = async (dayIndex, sessionIndex) => {
        try {
            if (!confirm("هل أنت متأكد من حذف الحصة؟")) return;

            setDeletingSession({ dayIndex, sessionIndex });

            const schoolId = classData.schoolId;

            const sessionToDelete = classData.timetable[dayIndex].sessions[sessionIndex];

            const subject = sessionToDelete.subject;
            const teacherId = sessionToDelete.teacher_id;

            //BEFORE deletion counts
            const subjectCountBefore = countSubjectOccurrences(
                classData.timetable,
                subject
            );

            const teacherSubjectCountBefore = countTeacherSubjectOccurrences(
                classData.timetable,
                teacherId,
                subject
            );

            // 🔥 REMOVE SESSION
            const updatedTimetable = [...classData.timetable];

            updatedTimetable[dayIndex] = {
                ...updatedTimetable[dayIndex],
                sessions: updatedTimetable[dayIndex].sessions.filter(
                    (_, i) => i !== sessionIndex
                ),
            };

            // If day empty → deactivate
            if (updatedTimetable[dayIndex].sessions.length === 0) {
                updatedTimetable[dayIndex].active = false;
            }

            // SAVE CLASS
            await updateDoc(doc(DB, "classes", classData.id), {
                timetable: updatedTimetable,
            });

            // ARCHIVE CONVERSATION (last subject)
            if (subjectCountBefore === 1) {
                await archiveClassSubjectConversation({
                    schoolId,
                    classId: classData.id,
                    subject,
                });
            }

            // REMOVE CLASS FROM TEACHER (last session)
            if (teacherSubjectCountBefore === 1) {
                const teacherRef = doc(DB, "teachers", teacherId);
                const teacherSnap = await getDocs(
                    query(collection(DB, "teachers"), where("__name__", "==", teacherId))
                );

                if (!teacherSnap.empty) {
                    const teacherData = teacherSnap.docs[0].data();
                    const subjectsObj = teacherData.subjects || {};

                    const subjectKey = Object.keys(subjectsObj).find(
                        key => subjectsObj[key].name === subject
                    );

                    if (subjectKey) {
                        await updateDoc(teacherRef, {
                            [`subjects.${subjectKey}.class_ids`]: arrayRemove(classData.id),
                        });
                    }
                }
            }

            alert("تم حذف الحصة");

        } catch (e) {
            console.error(e);
            alert("فشل حذف الحصة");
        } finally {
            setDeletingSession(null)
        }
    };

    return (
        <div className="card">
            <div className="card-header timetable-header">
                <h4>الجدول الدراسي</h4>

                <button className="create-btn" onClick={openAdd}>
                    <p>+ إضافة حصة</p>
                </button>
            </div>

            <Modal
                open={openAddModal}
                onCancel={() => setOpenAddModal(false)}
                footer={null}
                centered
            >
                <div className="create-school-form">
                    <h3>إضافة حصة</h3>

                    <select
                        value={selectedDayIndex ?? ""}
                        onChange={(e) => setSelectedDayIndex(Number(e.target.value))}
                    >
                        <option value="">اختر اليوم</option>
                        {classData.timetable.map((day) => (
                            <option key={day.dayIndex} value={day.dayIndex}>
                                {day.day}
                            </option>
                        ))}
                    </select>

                    <select
                        value={newSession.subject}
                        onChange={(e) =>
                            setNewSession({
                                ...newSession,
                                subject: e.target.value,
                                teacher_id: "",
                            })
                        }
                    >
                        <option value="">اختر المادة</option>
                        {SUBJECTS.map((s) => (
                            <option key={s}>{s}</option>
                        ))}
                    </select>

                    {newSession.subject && (
                        <select
                            value={newSession.teacher_id}
                            onChange={(e) =>
                                setNewSession({ ...newSession, teacher_id: e.target.value })
                            }
                        >
                            <option value="">اختر المعلم</option>
                            {getTeachersBySubject(newSession.subject).map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
                    )}

                    <div className="time-row">
                        <input
                            type="time"
                            value={newSession.start}
                            onChange={(e) =>
                                setNewSession({ ...newSession, start: e.target.value })
                            }
                        />
                        <input
                            type="time"
                            value={newSession.end}
                            onChange={(e) =>
                                setNewSession({ ...newSession, end: e.target.value })
                            }
                        />
                    </div>

                    {savingNewSession ? (
                        <div className="btn-loading">
                            <ClipLoader size={15} color="#fff" />
                        </div>
                    ) : (
                        <button className="create-submit" onClick={handleAddSession}>
                             حفظ
                        </button>
                    )}

                </div>
            </Modal>

            <div className="card-content">
                {classData.timetable.every(d => d.sessions.length === 0) ? (
                    <div className="empty">لا توجد حصص</div>
                ) : (
                    classData.timetable.map((day) => (
                        <div key={day.dayIndex} className="day-section">
                            <h4 className="day-title">{day.day}</h4>

                            {day.sessions.length === 0 ? (
                                <div className="empty">لا توجد حصص</div>
                            ) : (
                                <div className="table">
                                    <div className="timetable-table-head">
                                        <span>المادة</span>
                                        <span>المعلم</span>
                                        <span>من</span>
                                        <span>إلى</span>
                                        <span>إجراءات</span>
                                    </div>

                                    {day.sessions.map((s, i) => (
                                        <div key={i} className="timetable-table-row">
                                            <span>{s.subject}</span>
                                            <span>{getTeacherName(teachers, s.teacher_id)}</span>
                                            <span>{formatTime(s.start)}</span>
                                            <span>{formatTime(s.end)}</span>
                                            <span className="actions">
                                                <button onClick={() => openEdit(day.dayIndex, i, s)}>
                                                    <FiEdit2 fontSize={16}/>
                                                </button>
 
                                                <button 
                                                    disabled={deletingSession !== null}
                                                    onClick={() => handleDeleteSession(day.dayIndex, i)}
                                                >
                                                    {deletingSession &&
                                                    deletingSession.dayIndex === day.dayIndex &&
                                                    deletingSession.sessionIndex === i ? (
                                                        <ClipLoader size={15} color="red" />
                                                    ) : (
                                                        <FaRegTrashCan fontSize={16} color="red" />
                                                    )}
                                                    
                                                </button>                               
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <Modal
                                open={openEditModal}
                                onCancel={() => setOpenEditModal(false)}
                                footer={null}
                                centered
                            >
                                <div className="create-school-form">
                                    <h3>تعديل الحصة</h3>

                                    <input
                                        value={classData.timetable[selectedDayIndex]?.day}
                                        disabled
                                    />

                                    <input value={newSession.subject} disabled />

                                    <input
                                        value={getTeacherName(teachers, newSession.teacher_id)}
                                        disabled
                                    />

                                    <div className="time-row">
                                        <input
                                            type="time"
                                            value={newSession.start}
                                            onChange={(e) =>
                                                setNewSession({ ...newSession, start: e.target.value })
                                            }
                                        />
                                        <input
                                            type="time"
                                            value={newSession.end}
                                            onChange={(e) =>
                                                setNewSession({ ...newSession, end: e.target.value })
                                            }
                                        />
                                    </div>

                                    {savingEditedSession ? (
                                        <div className="btn-loading">
                                            <ClipLoader size={15} color="#fff" />
                                        </div>
                                    ) : (
                                        <button className="create-submit" onClick={handleEditSession}>
                                             حفظ التعديل
                                        </button>
                                    )}
                                </div>
                            </Modal>
                        </div>
                    ))
                )}

            </div>
        </div>
    );
};

const ClassDetails = () => {
    const { id } = useParams();
    const { classes, students, teachers, loading } = useGlobalState();

    const [openMoveModal, setOpenMoveModal] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [targetClassId, setTargetClassId] = useState("");
    const [targetClassName, setTargetClassName] = useState("");
    const [targetClassGrade, setTargetClassGrade] = useState("");
    const [switchLoading, setSwitchLoading] = useState(false);

    const currentClass = classes.find(c => c.id === id);

    const classStudents = useMemo(() => {
        return students.filter((s) => s.class_id === id && !s.account_deleted);
    }, [students, id]);

    const schoolClasses = useMemo(() => {
        return sortClasses(classes.filter(c => c.schoolId === currentClass.schoolId));
    }, [classes, currentClass]);

    //Remove student from old class conversation
    const removeStudentFromClassConversations = async (schoolId, classId, studentId) => {
        const snap = await getDocs(
            query(
                collection(DB, "conversations"),
                where("school_id", "==", schoolId),
                where("class_id", "==", classId),
                where("scope", "==", "class_subject"),
                where("archived", "==", false)
            )
        );

        await Promise.all(
            snap.docs.map(d =>
                updateDoc(doc(DB, "conversations", d.id), {
                    participant_ids: arrayRemove(studentId),
                })
            )
        );
    };

    //add student to new class conversation
    const addStudentToClassConversations = async (schoolId, classId, studentId) => {
        const snap = await getDocs(
            query(
                collection(DB, "conversations"),
                where("school_id", "==", schoolId),
                where("class_id", "==", classId),
                where("scope", "==", "class_subject"),
                where("archived", "==", false)
            )
        );

        await Promise.all(
            snap.docs.map(d =>
                updateDoc(doc(DB, "conversations", d.id), {
                    participant_ids: arrayUnion(studentId),
                })
            )
        );
    };

    //Handle move student
    const handleMoveStudent = async () => {
        try {
            if (!targetClassId) {
                alert("يرجى اختيار الصف الجديد");
                return;
            }

            if (targetClassId === currentClass.id) {
                alert("الطالب موجود بالفعل في هذا الصف");
                return;
            }

            setSwitchLoading(true);

            const schoolId = currentClass.schoolId;
            const studentId = selectedStudent.id;

            //Remove from old class
            await removeStudentFromClassConversations(
                schoolId,
                currentClass.id,
                studentId
            );

            //Add to new class
            await addStudentToClassConversations(
                schoolId,
                targetClassId,
                studentId
            );

            //Update student document
            await updateDoc(doc(DB, "students", studentId), {
                class_id: targetClassId,
                class_name: targetClassName,
                class_grade:targetClassGrade
            });

            alert("تم نقل الطالب بنجاح");

            setOpenMoveModal(false);
            setTargetClassId("");
            setTargetClassName("");
            setTargetClassGrade("");

        } catch (e) {
            console.error(e);
            alert("فشل نقل الطالب");
        } finally {
            setSwitchLoading(false);
        }
    };

    if (loading || !currentClass) {
        return <div className="loader"><ClipLoader /></div>;
    }

    return (
        <div className="class-details-container">
            <div className="class-header">
                <h2>{currentClass.name}</h2>
            </div>

            <div className="card">
                <div className="card-header">                    
                    <h4>الطلاب ({classStudents.length})</h4>
                </div>

                <div className="card-content">
                    <div className="table">
                        <div className="class-details-students-table-head">
                            <span>الاسم</span>
                            <span>الهاتف</span>
                            <span>إجراءات</span>
                        </div>

                        {classStudents.length === 0 ? (
                            <div className="empty">لا يوجد طلاب</div>
                        ) : (
                            classStudents.map((s) => (
                                <div key={s.id} className="class-details-students-table-row">
                                    <span>{s.name} {s.parent_name}</span>
                                    <span className="phone-number">{s.phone_number}</span>
                                    <span className="actions">
                                        <button
                                            onClick={() => {
                                                setSelectedStudent(s);
                                                setOpenMoveModal(true);
                                            }}
                                        >
                                            <FaExchangeAlt fontSize={16}/>
                                        </button>                              
                                    </span>
                                </div>
                            ))
                        )}

                        <Modal
                            open={openMoveModal}
                            onCancel={() => setOpenMoveModal(false)}
                            footer={null}
                            centered
                        >
                            <div className="create-school-form">
                                <h3>نقل الطالب</h3>

                                <div className="switch-box">
                                    <p>الطالب</p>
                                    <strong>{selectedStudent?.name} {selectedStudent?.parent_name}</strong>
                                </div>

                                <div className="switch-box">
                                    <p>الصف الحالي</p>
                                    <strong>{currentClass.name}</strong>
                                </div>

                                <select
                                    value={targetClassId}
                                    onChange={(e) => {
                                        const cls = schoolClasses.find(c => c.id === e.target.value);
                                        setTargetClassId(cls.id);
                                        setTargetClassName(cls.name);
                                        setTargetClassGrade(cls.grade);
                                    }}
                                >
                                    <option value="">اختر الصف الجديد</option>

                                    {schoolClasses
                                        .filter(c => c.id !== currentClass.id)
                                        .map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}
                                            </option>
                                        ))}
                                </select>

                                {switchLoading ? (
                                    <div className="btn-loading">
                                        <ClipLoader size={15} color="#fff" />
                                    </div>
                                ) : (
                                    <button className="create-submit" onClick={handleMoveStudent}>
                                         نقل
                                    </button>
                                )}

                            </div>
                        </Modal>
                    </div>
                </div>
            </div>

            {/* TIMETABLE */}
            <TimetableSection
                classData={currentClass}
                teachers={teachers}
                students={classStudents}
            />

        </div>
    );
};

export default ClassDetails;