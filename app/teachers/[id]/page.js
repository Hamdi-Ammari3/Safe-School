"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGlobalState } from "../../../globalState";
import { doc, updateDoc, Timestamp, runTransaction } from "firebase/firestore";
import { DB } from "../../../firebaseConfig";
import ClipLoader from "react-spinners/ClipLoader";
import { Modal } from "antd";
import { FaUser } from "react-icons/fa";
import "../../style.css";

const TeacherDetails = () => {
    const { id } = useParams();
    const router = useRouter();

    const { teachers, classes, loading } = useGlobalState();

    const [openEditModal, setOpenEditModal] = useState(false);
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [editName, setEditName] = useState("");
    const [editSubjects, setEditSubjects] = useState([]);
    const [teacherSubjectsMap, setTeacherSubjectsMap] = useState({});
    const [deletingTeacher, setDeletingTeacher] = useState(false);

    // Find teacher
    const teacher = useMemo(() => {
        return teachers.find((t) => t.id === id);
    }, [teachers, id]);

    // Map class id → name
    const classMap = useMemo(() => {
        const map = {};
        classes.forEach((c) => {
            map[c.id] = `${c.grade} - ${c.section}`;
        });
        return map;
    }, [classes]);

    const SUBJECTS = [
        "اللغة العربية","اللغة الإنجليزية","اللغة الفرنسية","الرياضيات",
        "العلوم","الفيزياء","الكيمياء","الأحياء",
        "التاريخ","الجغرافيا","التربية الإسلامية",
        "التربية الوطنية","التربية الفنية","التربية الرياضية",
        "الحاسوب","الاقتصاد","علم الاجتماع","الفلسفة","المنطق"
    ];

    //Open edit modal
    const openEditTeacher = () => {
        const subjectsObj = teacher.subjects || {};

        setTeacherSubjectsMap(subjectsObj);

        setEditName(teacher.name || "");

        setEditSubjects(
            Object.values(subjectsObj).map((s) => s.name)
        );

        setOpenEditModal(true);
    };

    //Remove subjects
    const handleRemoveSubject = (subj) => {
        // ❌ prevent removing last subject
        if (editSubjects.length === 1) {
            alert("يجب أن يكون لدى المعلم مادة واحدة على الأقل");
            return;
        }

        const subjectId = subj.replace(/\s+/g, "_").toLowerCase();
        const subjectData = teacherSubjectsMap[subjectId];

        // ❌ prevent removing if linked to classes
        if (subjectData?.class_ids?.length > 0) {
            alert("لا يمكن حذف مادة مرتبطة بصفوف");
            return;
        }

        setEditSubjects(prev => prev.filter(s => s !== subj));
    };

    //Update teacher data
    const handleUpdateTeacher = async () => {
        try {
            setLoadingEdit(true);

            if (!editName.trim()) {
                alert("يرجى إدخال الاسم");
                return;
            }

            if (editSubjects.length === 0) {
                alert("يجب تحديد مادة واحدة على الأقل");
                return;
            }

            const oldSubjects = teacherSubjectsMap;

            const updatedSubjects = {};

            editSubjects.forEach((subjectName) => {
                const subjectId = subjectName.replace(/\s+/g, "_").toLowerCase();

                updatedSubjects[subjectId] = {
                    name: subjectName,
                    class_ids: oldSubjects[subjectId]?.class_ids || [],
                };
            });

            // 🔥 Update teacher
            await updateDoc(doc(DB, "teachers", teacher.id), {
                name: editName.trim(),
                subjects: updatedSubjects,
            });

            // 🔥 Update schoolAdmins name (IMPORTANT)
            await updateDoc(
                doc(DB, "schoolAdmins", teacher.username),
                {
                    name: editName.trim(),
                }
            );

            alert("تم تحديث بيانات المعلم");

            setOpenEditModal(false);

        } catch (e) {
            console.error(e);
            alert("فشل التحديث");
        } finally {
            setLoadingEdit(false);
        }
    };

    //Delete Teacher doc
    const handleDeleteTeacher = async (teacher) => {
        if (deletingTeacher) return;

        const confirmDelete = confirm("هل أنت متأكد من حذف حساب المعلم؟");
        if (!confirmDelete) return;

        try {
            setDeletingTeacher(true);

            const teacherRef = doc(DB, "teachers", teacher.id);
            const schoolAdminRef = doc(DB, "schoolAdmins", teacher.username);

            const result = await runTransaction(DB, async (transaction) => {
                const teacherSnap = await transaction.get(teacherRef);

                if (!teacherSnap.exists()) {
                    return { error: "TEACHER_NOT_FOUND" };
                }

                const teacherData = teacherSnap.data();
                const subjects = teacherData.subjects || {};

                const hasClasses = Object.values(subjects).some(
                    (subj) => subj.class_ids && subj.class_ids.length > 0
                );

                if (hasClasses) {
                    return { error: "TEACHER_HAS_CLASSES" };
                }

                transaction.update(teacherRef, {
                    account_deleted: true,
                    is_active: false,
                    deleted_at: Timestamp.now(),
                });

                transaction.update(schoolAdminRef, {
                    account_banned: true,
                    banned_at: Timestamp.now(),
                });

                return { success: true };
            });

            if (result?.error) {
                if (result.error === "TEACHER_HAS_CLASSES") {
                    alert("لا يمكن حذف المعلم لأنه مرتبط بصفوف دراسية");
                } else if (result.error === "TEACHER_NOT_FOUND") {
                    alert("حساب المعلم غير موجود");
                }
                return;
            }

            alert("تم حذف حساب المعلم بنجاح");

            router.push("/");

        } catch (e) {
            console.error(e);
            alert("فشل حذف الحساب");
        } finally {
            setDeletingTeacher(false);
        }
    };

    if (loading || !teacher) {
        return (
            <div className="loader">
                <ClipLoader />
            </div>
        );
    }

    const subjects = teacher.subjects || {};

    return (
        <div className="student-details-container">

            {/* HEADER */}
            <div className="card student-header">
                <div className="student-avatar">
                    <FaUser size={30} />
                </div>

                <div className="student-details-info">
                    <h3>{teacher.name}</h3>
                    <p className="sub-text">مدرس</p>
                </div>
            </div>

            {/* BASIC INFO */}
            <div className="card">
                <div className="card-header">
                    <h3>معلومات المدرس</h3>
                </div>

                <div className="card-content details-grid">
                    <Detail label="الاسم" value={teacher.name} />
                    <Detail label="رقم الهاتف" value={teacher.username} />
                    <Detail label="كلمة المرور" value={teacher.password} />
                </div>
            </div>

            {/* SUBJECTS */}
            <div className="card">
                <div className="card-header">
                    <h3>المواد و الفصول</h3>
                </div>

                <div className="card-content">

                    {Object.keys(subjects).length === 0 ? (
                        <div className="empty">لا توجد مواد</div>
                    ) : (
                        Object.keys(subjects).map((key) => {
                            const subject = subjects[key];

                            return (
                                <div key={key} className="teacher-subject-box">
                                    <h4 className="subject-title">{subject.name}</h4>
                                    <div className="chips-container">
                                        {subject.class_ids?.map((cid) => (
                                            <div key={cid} className="teacher-details-page-class-chip">
                                                {classMap[cid] || "-"}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}

                </div>
            </div>

            {/* ACTIONS */}
            <div className="student-details-delete-btn-box">
                <button
                    className="student-details-delete-btn"
                    style={{ backgroundColor: "#ef4444" }}
                    onClick={() => handleDeleteTeacher(teacher)}
                >
                    {deletingTeacher ? (
                        <ClipLoader size={15} color="#fff" />
                    ) : (
                        "حذف الحساب"
                    )}
                </button>

                <button
                    className="student-details-delete-btn"
                    style={{ backgroundColor: "#008CBA" }}
                    onClick={openEditTeacher}
                >
                     تعديل البيانات
                </button>
            </div>
            <Modal
                title="تعديل بيانات المعلم"
                open={openEditModal}
                onCancel={() => setOpenEditModal(false)}
                footer={null}
                centered
            >
                <div className="create-school-form">
                    <input
                        placeholder="اسم المعلم"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                    />

                    {/* SUBJECT SELECT */}
                    <select
                        onChange={(e) => {
                            const value = e.target.value;
                            if (value && !editSubjects.includes(value)) {
                                setEditSubjects([...editSubjects, value]);
                            }
                        }}
                    >
                        <option value="">اختر المادة</option>
                        {SUBJECTS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    {/* SELECTED SUBJECTS */}
                    <div className="chips-container" style={{ marginTop: 10,justifyContent:'flex-end' }}>
                        {editSubjects.map((subj) => (
                            <div key={subj} className="chip subject-chip">
                                {subj}
                                <span
                                    className="remove-chip"
                                    onClick={() => handleRemoveSubject(subj)}
                                >
                                    ×
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* SUBMIT */}
                    {loadingEdit ? (
                        <div className="btn-loading">
                            <ClipLoader size={15} color="#fff" />
                        </div>
                    ) : (
                        <button className="create-submit" onClick={handleUpdateTeacher}>
                         حفظ التعديلات
                        </button>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default TeacherDetails;

const Detail = ({ label, value }) => {
    return (
        <div className="detail-item">
            <span className="label">{label}</span>
            <span className="value">{value || "-"}</span>
        </div>
    );
};