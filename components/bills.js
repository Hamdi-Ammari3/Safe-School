"use client";

import React, { useMemo, useState } from "react";
import { useGlobalState } from "../globalState";
import { useRouter } from "next/navigation";
import ClipLoader from "react-spinners/ClipLoader";
import "../app/style.css";

const Billing = () => {
    const { students, bills, loading } = useGlobalState();
    const router = useRouter();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedYear, setSelectedYear] = useState("all");
    const [studentStatusFilter, setStudentStatusFilter] = useState("all");

    //Get the academic years
    const academicYears = useMemo(() => {
        const setYears = new Set();

        bills.forEach((b) => {
            if (b.academic_year) {
                setYears.add(b.academic_year);
            }
        });

        return Array.from(setYears).sort((a, b) => a.localeCompare(b));
    }, [bills]);

    // 🔹 Map students
    const studentsMap = useMemo(() => {
        const map = {};
        students.forEach((s) => {
            map[s.id] = s;
        });
        return map;
    }, [students]);

    // 🔹 Build billing map (same as app)
    const studentsBilling = useMemo(() => {
        const map = {};

        bills.forEach((b) => {
            if (!studentsMap[b.student_id]) return;

            if (!map[b.student_id]) {
                map[b.student_id] = {
                    student_id: b.student_id,
                    installmentsByYear: {},
                    total: 0,
                    paid: 0,
                };
            }

            const amount = Number(b.amount || 0);
            const paidAmount = Number(b.paid_amount || 0);
            const remaining = Math.max(amount - paidAmount, 0);

            let status = "unpaid";
            if (remaining === 0) status = "paid";
            else if (paidAmount > 0) status = "partial";

            const year = b.academic_year;

            if (!map[b.student_id].installmentsByYear[year]) {
                map[b.student_id].installmentsByYear[year] = [];
            }

            map[b.student_id].installmentsByYear[year].push({
                index: b.installment_index,
                amount,
                paid_amount: paidAmount,
                remaining,
                status,
            });

            map[b.student_id].total += amount;
            map[b.student_id].paid += paidAmount;
        });

        // sort each year
        Object.values(map).forEach((s) => {
            Object.keys(s.installmentsByYear).forEach((year) => {
                s.installmentsByYear[year].sort((a, b) => a.index - b.index);
            });

            s.unpaid = s.total - s.paid;
        });

        return map;
    }, [bills, studentsMap]);

    // GLOBAL STATS
    const stats = useMemo(() => {
        let total = 0;
        let paid = 0;

        Object.values(studentsBilling).forEach((s) => {
            Object.entries(s.installmentsByYear).forEach(([year, list]) => {

                if (selectedYear !== "all" && year !== selectedYear) return;

                list.forEach((b) => {
                    total += Number(b.amount || 0);
                    paid += Number(b.paid_amount || 0);
                });
            });
        });

        return {
            total,
            paid,
            unpaid: total - paid,
        };
    }, [studentsBilling, selectedYear]);

    //Filtered students
    const filteredStudents = useMemo(() => {
        return Object.values(studentsBilling)
        .filter((s) => {
            const student = studentsMap[s.student_id];
            if (!student) return false;

            if (search && !student.name.includes(search)) return false;

            if (studentStatusFilter === "active" && student.account_deleted) {
                return false;
            }

            if (studentStatusFilter === "deleted" && !student.account_deleted) {
                return false;
            }

            return true;
        })
        .map((s) => {
            const filteredYears = {};

            Object.entries(s.installmentsByYear).forEach(([year, installments]) => {
                if (selectedYear !== "all" && year !== selectedYear) return;

                let list = installments;

                if (statusFilter !== "all") {
                    list = list.filter((i) => i.status === statusFilter);
                }

                if (list.length > 0) {
                    filteredYears[year] = list;
                }
            });

            return {
                ...s,
                installmentsByYear: filteredYears,
            };
        })
        .filter((s) => Object.keys(s.installmentsByYear).length > 0);
    }, [studentsBilling, selectedYear, statusFilter, search,studentStatusFilter]);

    if (loading) {
        return (
            <div className="loader">
                <ClipLoader />
            </div>
        );
    }

    return (
        <div className="students-container">
            <h2 className="students-title">الحسابات</h2>

            <div className="billing-stats">
                <StatBox label="المجموع" value={stats.total} />
                <StatBox label="المدفوع" value={stats.paid} success />
                <StatBox label="المتبقي" value={stats.unpaid} danger />
            </div>

            <div className="students-filters">
                <input
                    placeholder="بحث عن طالب..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    value={studentStatusFilter}
                    onChange={(e) => setStudentStatusFilter(e.target.value)}
                >
                    <option value="all">كل الطلاب</option>
                    <option value="active">النشطين</option>
                    <option value="deleted">المنقطعين</option>
                </select>
            </div>

            <div className="filter-row">
                <FilterBtn
                    label="كل السنوات"
                    active={selectedYear === "all"}
                    onClick={() => setSelectedYear("all")}
                />

                {academicYears.map((year) => (
                    <FilterBtn
                        key={year}
                        label={year}
                        active={selectedYear === year}
                        onClick={() => setSelectedYear(year)}
                    />
                ))}
            </div>

            <div className="filter-row">
                <FilterBtn label="الكل" active={statusFilter === "all"} onClick={() => setStatusFilter("all")} />
                <FilterBtn label="مدفوع" active={statusFilter === "paid"} onClick={() => setStatusFilter("paid")} />
                <FilterBtn label="جزئي" active={statusFilter === "partial"} onClick={() => setStatusFilter("partial")} />
                <FilterBtn label="غير مدفوع" active={statusFilter === "unpaid"} onClick={() => setStatusFilter("unpaid")} />
            </div>

            {/* 🔥 STUDENTS LIST */}
            <div className="billing-list">
                {filteredStudents.map((s) => {
                    const student = studentsMap[s.student_id];
                    return (
                        <div 
                            key={s.student_id} 
                            onClick={() => router.push(`/bills/${student.id}`)}
                            className="billing-card"
                            style={{cursor:'pointer'}}
                        >
                            <div className="billing-card-header">
                                <div className="billing-card-header-student-name">
                                    <h4>{student.name} {student.parent_name}</h4>
                                    <h4>-</h4>
                                    <p>{student.class_name}</p>
                                    {student.account_deleted && (
                                        <p className="student-deleted-badge" style={{fontSize:'12px'}}>
                                         منقطع
                                        </p>
                                    )}
                                </div>

                                <div className="billing-total">
                                    <span>
                                        {
                                            Object.entries(s.installmentsByYear).reduce((sum, [year, list]) => {
                                                return sum + list.reduce((s2, b) => s2 + (b.amount - b.paid_amount), 0);
                                            }, 0).toLocaleString("ar-IQ")
                                        }
                                    </span>
                                </div>
                            </div>

                            {Object.entries(s.installmentsByYear)
                                .sort((a, b) => a[0].localeCompare(b[0]))
                                .map(([year, installments]) => (
                                    <div key={year} className="academic-year-section">
                                        <div className="academic-year-label">
                                            {year}
                                        </div>

                                        <div className="installments-row">
                                            {installments.map((inst, index) => {
                                                const displayAmount =
                                                    inst.status === "partial"
                                                    ? inst.remaining
                                                    : inst.amount;

                                                return (
                                                    <div
                                                        key={index}
                                                        className={`installment-chip ${inst.status}`}
                                                    >
                                                         قسط {inst.index} - {displayAmount.toLocaleString("ar-IQ")}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Billing;

// 🔹 Components
const StatBox = ({ label, value, success, danger }) => (
    <div className={`stat-box ${success ? "success" : danger ? "danger" : "total"}`}>
        <p>{label}</p>
        <h3>{value.toLocaleString("ar-IQ")}</h3>
    </div>
);

const FilterBtn = ({ label, subLabel, active, onClick }) => (
    <div
        className={`filter-btn ${active ? "active" : ""}`}
        onClick={onClick}
    >
        <div className="filter-btn-content">
            <span className="filter-btn-label">{label}</span>

            {subLabel && (
                <span className="filter-sub-label">
                    {subLabel}
                </span>
            )}
        </div>
    </div>
);