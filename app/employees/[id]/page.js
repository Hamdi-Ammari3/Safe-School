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

const EmployeeDetails = () => {
    const { id } = useParams();
    const router = useRouter();

    const { employees, loading } = useGlobalState();

    const [openEditModal, setOpenEditModal] = useState(false);
    const [loadingEdit, setLoadingEdit] = useState(false);
    const [editName, setEditName] = useState("");
    const [deletingEmployee, setDeletingEmployee] = useState(false);

    // Find employee
    const employee = useMemo(() => {
        return employees.find((t) => t.id === id);
    }, [employees, id]);

    //Open edit modal
    const openEditTeacher = () => {
        setEditName(employee.name || "");
        setOpenEditModal(true);
    };


    //Update employee data    
    const handleUpdateEmployee = async () => {
        try {
            setLoadingEdit(true);

            if (!editName.trim()) {
                alert("يرجى إدخال الاسم");
                return;
            }

            // 🔥 Update teacher
            await updateDoc(doc(DB, "employees", employee.id), {
                name: editName.trim(),
            });

            // 🔥 Update schoolAdmins name (IMPORTANT)
            await updateDoc(
                doc(DB, "schoolAdmins", employee.username),
                {
                    name: editName.trim(),
                }
            );

            alert("تم تحديث بيانات الموظف");

            setOpenEditModal(false);

        } catch (e) {
            console.error(e);
            alert("فشل التحديث");
        } finally {
            setLoadingEdit(false);
        }
    };

    //Delete employee doc
    const handleDeleteEmployee = async (employee) => {
        if (deletingEmployee) return;

        const confirmDelete = confirm("هل أنت متأكد من حذف حساب الموظف");
        if (!confirmDelete) return;

        try {
            setDeletingEmployee(true);

            const employeeRef = doc(DB, "employees", employee.id);
            const schoolAdminRef = doc(DB, "schoolAdmins", employee.username);

            const result = await runTransaction(DB, async (transaction) => {
                const employeeSnap = await transaction.get(employeeRef);

                if (!employeeSnap.exists()) {
                    return { error: "EMPLOYEE_NOT_FOUND" };
                }

                transaction.update(employeeRef, {
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
                 if (result.error === "EMPLOYEE_NOT_FOUND") {
                    alert("حساب الموظف غير موجود");
                }
                return;
            }

            alert("تم حذف حساب الموظف بنجاح");

            router.push("/");

        } catch (e) {
            console.error(e);
            alert("فشل حذف الحساب");
        } finally {
            setDeletingEmployee(false);
        }
    };

    if (loading || !employee) {
        return (
            <div className="loader">
                <ClipLoader />
            </div>
        );
    }

    return (
        <div className="student-details-container">

            {/* HEADER */}
            <div className="card student-header">
                <div className="student-avatar">
                    <FaUser size={30} />
                </div>

                <div className="student-details-info">
                    <h3>{employee.name}</h3>
                    <p className="sub-text">{employee.job_title}</p>
                </div>
            </div>

            {/* BASIC INFO */}
            <div className="card">
                <div className="card-header">
                    <h3>معلومات الموظف</h3>
                </div>

                <div className="card-content details-grid">
                    <Detail label="الاسم" value={employee.name} />
                    <Detail label="رقم الهاتف" value={employee.username} />
                    <Detail label="كلمة المرور" value={employee.password} />
                </div>
            </div>

            {/* ACTIONS */}
            <div className="student-details-delete-btn-box">
                <button
                    className="student-details-delete-btn"
                    style={{ backgroundColor: "#ef4444" }}
                    onClick={() => handleDeleteEmployee(employee)}
                >
                    {deletingEmployee ? (
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
                title="تعديل بيانات الموظف"
                open={openEditModal}
                onCancel={() => setOpenEditModal(false)}
                footer={null}
                centered
            >
                <div className="create-school-form">
                    <input
                        placeholder="الاسم"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                    />

                    {/* SUBMIT */}
                    {loadingEdit ? (
                        <div className="btn-loading">
                            <ClipLoader size={15} color="#fff" />
                        </div>
                    ) : (
                        <button className="create-submit" onClick={handleUpdateEmployee}>
                         حفظ التعديلات
                        </button>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default EmployeeDetails;

const Detail = ({ label, value }) => {
    return (
        <div className="detail-item">
            <span className="label">{label}</span>
            <span className="value">{value || "-"}</span>
        </div>
    );
};