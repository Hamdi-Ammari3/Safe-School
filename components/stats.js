import React from 'react'
import { useGlobalState } from '../globalState'
import { PiStudentLight } from "react-icons/pi"
import { IoBus } from "react-icons/io5"
import ClipLoader from "react-spinners/ClipLoader"

const Stats = () => {
    const {riders,lines,loading } = useGlobalState()

    return (
    <div className='main_section_stat'>
        <div className='main_section_stat_header_div'>
            <h4>إحصائيات</h4>
        </div>
        <div className='main_section_stat_items'>
            <div className='main_section_stat_item'>
                <div className='main_section_stat_item_icon_div' style={{backgroundColor:'#955BFE'}}>
                    <PiStudentLight className='main_section_stat_item_icon'/>
                </div>
                <div className='main_section_stat_info_item'>
                    <p>طلاب</p>
                    {loading ? (
                    <div style={{ width:'50px',padding:'10px 0',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <ClipLoader
                        color={'#955BFE'}
                        loading={loading}
                        size={10}
                        aria-label="Loading Spinner"
                        data-testid="loader"
                        />
                    </div>
                    ) : (
                    <h5>{riders.length}</h5>
                    )}
                </div>
            </div>

            <div className='main_section_stat_item'>
                <div className='main_section_stat_item_icon_div' style={{backgroundColor:'#7ABA37'}}>
                    <IoBus className='main_section_stat_item_icon'/>
                </div>
                <div className='main_section_stat_info_item'>
                    <p>خطوط</p>
                    {loading ? (
                        <div style={{ width:'50px',padding:'10px 0',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <ClipLoader
                                color={'#955BFE'}
                                loading={loading}
                                size={10}
                                aria-label="Loading Spinner"
                                data-testid="loader"
                            />
                        </div>
                    ) : (
                        <h5>{lines.length}</h5>
                    )}
                </div>
            </div>
        </div>
    </div>
  )
}

export default Stats