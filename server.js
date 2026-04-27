require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
// === (جديد) المكتبات اللازمة لرفع الملفات ===
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' })); // زيادة الحد إلى 10 ميجابايت
// === (جديد) إعداد مسار التخزين للملفات (فيديو، صوت، صور، PDF) ===
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // حد أقصى 100 ميجابايت
});

// === (جديد) السماح بعرض الملفات من خلال المتصفح ===
app.use('/uploads', express.static(uploadDir));
// ================================================

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};
// API للفصول
app.post('/api/class', async (req, res) => {
    const { id, schoolId, stageId, gradeId, name, shoabaId, operation } = req.body;
    // 1,2,3 = فصول (CLASES)  |  4,5,6 = شعب (SHOAB)

    try {
        const request = new sql.Request();
        request.input('sch1', sql.Int, id || 0);
        request.input('sch2', sql.Int, schoolId);
        request.input('sch3', sql.Int, stageId || 0);
        request.input('sch4', sql.Int, gradeId || 0);
        request.input('sch5', sql.NVarChar(100), name || '');
        request.input('sch6', sql.Int, shoabaId || null);   // ← الشعبة المرتبطة بالفصل
        request.input('INPOT', sql.Int, operation);

        await request.execute('INSER_UPDAT_DELETTAB_6');
        res.json({ success: true });
    } catch (err) {
        console.log('خطأ:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// API عام لجلب البيانات (المديريات، الإدارات، إلخ)
app.get('/api/getData/:type', async (req, res) => {
    const type = parseInt(req.params.type);
    
    try {
        const request = new sql.Request();
        request.input('INPOT', sql.Int, type);
        const result = await request.execute('SELCT_MAX_SUMTAB_all');
        res.json({
            success: true,
            data: result.recordset
        });
    } catch (err) {
        console.error('خطأ في getData:', err);
        res.status(500).json({
            success: false,
            message: "حدث خطأ: " + err.message
        });
    }
});

// API لجلب آخر رقم مديرية
app.get('/api/moderia/lastId', async (req, res) => {
    try {
        const request = new sql.Request();
        request.input('INPOT', sql.Int, 2); // INPOT 2 = آخر رقم + 1
        const result = await request.execute('SELCT_MAX_SUMTAB_all');
        
        // الـ column بدون اسم، ناخد أول قيمة
        let lastId = 0;
        if (result.recordset && result.recordset.length > 0) {
            const row = result.recordset[0];
            // نجرب الأسماء المختلفة
            lastId = row[''] || row['الرقم'] || row['ModriaID'] || Object.values(row)[0] || 0;
        }
        
        res.json({ success: true, lastId: lastId });
    } catch (err) {
        console.error('خطأ في lastId:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// إضافة / تعديل / حذف مديرية
app.post('/api/moderia', async (req, res) => {
    const { id, name, operation } = req.body;
    
    console.log('طلب حفظ:', { id, name, operation });
    
    try {
        const request = new sql.Request();
        request.input('sch1', sql.Int, id);
        request.input('sch2', sql.NVarChar(100), name);
        request.input('INPOT', sql.Int, operation);
        
        await request.execute('INSER_UPDAT_DELETTAB_2');
        
        console.log('تم الحفظ بنجاح');
        res.json({ success: true, message: 'تمت العملية بنجاح' });
    } catch (err) {
        console.error('خطأ في الحفظ:', err);
        res.status(500).json({ success: false, message: err.message });
    }
});
// API للإدارات (لديها parent - المديرية)
app.post('/api/saveWithParent', async (req, res) => {
    const { id, parentId, name, operation } = req.body;
    // operation: 1=إضافة, 2=تعديل, 3=حذف
    
    try {
        const request = new sql.Request();
        request.input('sch1', sql.Int, id);           // رقم الإدارة
        request.input('sch2', sql.Int, parentId);     // رقم المديرية
        request.input('sch3', sql.NVarChar(100), name); // اسم الإدارة
        request.input('INPOT', sql.Int, operation);   // نوع العملية
        
        await request.execute('INSER_UPDAT_DELETTAB_3');
        res.json({ success: true });
    } catch (err) {
        console.log('خطأ:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// API للمدارس
app.post('/api/school', async (req, res) => {
    const { id, moderiaId, edaraId, code, name, image, operation } = req.body;
    
    try {
        const request = new sql.Request();
        request.input('sch1', sql.Int, id);
        request.input('sch2', sql.Int, moderiaId);
        request.input('sch3', sql.Int, edaraId);
        request.input('sch4', sql.NVarChar(100), code);
        request.input('sch5', sql.NVarChar(100), name);
        request.input('sch6', sql.VarBinary(sql.MAX), image ? Buffer.from(image, 'base64') : null);
        request.input('INPOT', sql.Int, operation);
        
        await request.execute('INSER_UPDAT_DELETTAB_4');
        res.json({ success: true });
    } catch (err) {
        console.log('خطأ:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// API للصفوف
app.post('/api/grade', async (req, res) => {
    const { id, schoolId, stageId, name, operation } = req.body;
    // operation: 1=إضافة, 2=تعديل, 3=حذف
    
    console.log('Received:', { id, schoolId, stageId, name, operation });
    
    try {
        const request = new sql.Request();
        request.input('sch1', sql.Int, id);              // GereadID
        request.input('sch2', sql.Int, schoolId);        // SchoolID
        request.input('sch3', sql.Int, stageId);         // MrahelID
        request.input('sch4', sql.NVarChar(100), name || ''); // GeraedName
        request.input('INPOT', sql.Int, operation);      // 1, 2, 3
        
        await request.execute('INSER_UPDAT_DELETTAB_5');
        res.json({ success: true });
    } catch (err) {
        console.log('خطأ:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// إضافة / تعديل / حذف مستخدم
app.post('/api/users', async (req, res) => {
    const { UserId, UserName, Password, PersonID, RoleId, ModriaID, EdaraID, SchoolID, IsActive, PersonType, operation } = req.body;
    // operation: 1=إضافة, 2=تعديل, 3=حذف
    
    console.log('Received User:', { UserId, UserName, operation });
    
    try {
        const request = new sql.Request();
        request.input('sch1', sql.Int, UserId);
        request.input('sch2', sql.NVarChar(100), UserName || '');
        request.input('sch3', sql.NVarChar(100), Password || '');
        request.input('sch4', sql.Int, PersonID || 0);
        request.input('sch5', sql.Int, RoleId || 0);
        request.input('sch6', sql.Int, ModriaID || null);
        request.input('sch7', sql.Int, EdaraID || null);
        request.input('sch8', sql.Int, SchoolID || null);
        request.input('sch9', sql.Bit, IsActive ? 1 : 0);
        request.input('sch10', sql.TinyInt, PersonType || 2);
        request.input('INPOT', sql.Int, operation);
        
        await request.execute('INSER_UPDAT_DELETTAB_5int_3nvv_1b');
        
        console.log('تم حفظ المستخدم بنجاح');
        res.json({ success: true });
    } catch (err) {
        console.error('خطأ في حفظ المستخدم:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// API البحث العام (scher1)
app.get('/api/search', async (req, res) => {
    const { scher, inpot } = req.query;
    
    if (!inpot) {
        return res.status(400).json({ success: false, error: 'INPOT is required' });
    }
    
    try {
        const request = new sql.Request();
        request.input('SCHER', sql.NVarChar(100), scher || '');
        request.input('INPOT', sql.Int, parseInt(inpot));
        
        const result = await request.execute('scher1');
        
        // لو فيه أكتر من جدول (multiple recordsets)
        if (result.recordsets && result.recordsets.length > 1) {
            res.json({ 
                success: true, 
                data: result.recordsets[0],
                data2: result.recordsets[1] 
            });
        } else {
            res.json({ 
                success: true, 
                data: result.recordset 
            });
        }
    } catch (err) {
        console.error('خطأ في search:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// API البحث العام (scher2)
app.get('/api/search2', async (req, res) => {
    const { SCHER1,SCHER2, inpot } = req.query;
    
    if (!inpot) {
        return res.status(400).json({ success: false, error: 'INPOT is required' });
    }
    
    try {
        const request = new sql.Request();
        request.input('SCHER1', sql.NVarChar(100), SCHER1 || '');
         request.input('SCHER2', sql.NVarChar(100), SCHER2 || '');
        request.input('INPOT', sql.Int, parseInt(inpot))     
        const result = await request.execute('scher2');
        
        // لو فيه أكتر من جدول (multiple recordsets)
        if (result.recordsets && result.recordsets.length > 1) {
            res.json({ 
                success: true, 
                data: result.recordsets[0],
                data2: result.recordsets[1] 
            });
        } else {
            res.json({ 
                success: true, 
                data: result.recordset 
            });
        }
    } catch (err) {
        console.error('خطأ في search:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// API البحث العام (scher3)
app.get('/api/search3', async (req, res) => {
    const { SCHER1,SCHER2,SCHER3, inpot } = req.query;
    
    if (!inpot) {
        return res.status(400).json({ success: false, error: 'INPOT is required' });
    }
    
    try {
        const request = new sql.Request();
        request.input('SCHER1', sql.NVarChar(100), SCHER1 || '');
         request.input('SCHER2', sql.NVarChar(100), SCHER2 || '');
         request.input('SCHER3', sql.NVarChar(100), SCHER3 || '');
        request.input('INPOT', sql.Int, parseInt(inpot))     
        const result = await request.execute('scher3');
        
        // لو فيه أكتر من جدول (multiple recordsets)
        if (result.recordsets && result.recordsets.length > 1) {
            res.json({ 
                success: true, 
                data: result.recordsets[0],
                data2: result.recordsets[1] 
            });
        } else {
            res.json({ 
                success: true, 
                data: result.recordset 
            });
        }
    } catch (err) {
        console.error('خطأ في search:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// API البحث العام (scher4)
app.get('/api/search4', async (req, res) => {
    const { SCHER1,SCHER2,SCHER3,SCHER4, inpot } = req.query;
    
    if (!inpot) {
        return res.status(400).json({ success: false, error: 'INPOT is required' });
    }
    
    try {
        const request = new sql.Request();
        request.input('SCHER1', sql.NVarChar(100), SCHER1 || '');
         request.input('SCHER2', sql.NVarChar(100), SCHER2 || '');
         request.input('SCHER3', sql.NVarChar(100), SCHER3 || '');
         request.input('SCHER4', sql.NVarChar(100), SCHER4 || '');
        request.input('INPOT', sql.Int, parseInt(inpot))     
        const result = await request.execute('scher4');
        
        // لو فيه أكتر من جدول (multiple recordsets)
        if (result.recordsets && result.recordsets.length > 1) {
            res.json({ 
                success: true, 
                data: result.recordsets[0],
                data2: result.recordsets[1] 
            });
        } else {
            res.json({ 
                success: true, 
                data: result.recordset 
            });
        }
    } catch (err) {
        console.error('خطأ في search:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// API البحث العام (scher4)
app.get('/api/search5', async (req, res) => {
    const { SCHER1,SCHER2,SCHER3,SCHER4,SCHER5, inpot } = req.query;
    
    if (!inpot) {
        return res.status(400).json({ success: false, error: 'INPOT is required' });
    }
    
    try {
        const request = new sql.Request();
        request.input('SCHER1', sql.NVarChar(100), SCHER1 || '');
         request.input('SCHER2', sql.NVarChar(100), SCHER2 || '');
         request.input('SCHER3', sql.NVarChar(100), SCHER3 || '');
         request.input('SCHER4', sql.NVarChar(100), SCHER4 || '');
       request.input('SCHER5', sql.NVarChar(100), SCHER5 || '');
        request.input('INPOT', sql.Int, parseInt(inpot))     
        const result = await request.execute('scher5');
        
        // لو فيه أكتر من جدول (multiple recordsets)
        if (result.recordsets && result.recordsets.length > 1) {
            res.json({ 
                success: true, 
                data: result.recordsets[0],
                data2: result.recordsets[1] 
            });
        } else {
            res.json({ 
                success: true, 
                data: result.recordset 
            });
        }
    } catch (err) {
        console.error('خطأ في search:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// API البحث العام (scher4)
app.get('/api/scher1int1dat', async (req, res) => {
    const { sch,SCHER2,SCHER3,SCHER4,SCHER5, inpot } = req.query;
    
    if (!inpot) {
        return res.status(400).json({ success: false, error: 'INPOT is required' });
    }
    
    try {
        const request = new sql.Request();
        request.input('sch', sql.Int, parseInt (sch) );
         request.input('SCHER2', sql.Date, new Date(SCHER2));
        request.input('INPOT', sql.Int, parseInt(inpot))     
        const result = await request.execute('scher1int1dat');
        
        // لو فيه أكتر من جدول (multiple recordsets)
        if (result.recordsets && result.recordsets.length > 1) {
            res.json({ 
                success: true, 
                data: result.recordsets[0],
                data2: result.recordsets[1] 
            });
        } else {
            res.json({ 
                success: true, 
                data: result.recordset 
            });
        }
    } catch (err) {
        console.error('خطأ في search:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// تسجيل الدخول
app.post('/api/login', async (req, res) => {
    const { username, password, schoolId, edaraId, modriaId, selectedRoleName } = req.body;

    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'يرجى إدخال اسم المستخدم وكلمة المرور' 
        });
    }

    try {
        // 1. التحقق من المستخدم
        const validateRequest = new sql.Request();
        validateRequest.input('UserName', sql.NVarChar(100), username);
        validateRequest.input('Password', sql.NVarChar(100), password);
        validateRequest.input('SchoolID', sql.Int, schoolId || null);
        validateRequest.input('EdaraID', sql.Int, edaraId || null);
        validateRequest.input('ModriaID', sql.Int, modriaId || null);
        
        const validateResult = await validateRequest.execute('ValidateUser');
        // التحقق من وجود نتائج
        if (!validateResult.recordset || validateResult.recordset.length === 0) {
             return res.json({ success: false, message: 'بيانات الدخول غير صحيحة (خطأ في التحقق)' });
        }
        
        const count = Object.values(validateResult.recordset[0])[0];

        if (count > 0) {
            // 2. جلب بيانات المستخدم
            const userRequest = new sql.Request();
            userRequest.input('UserName', sql.NVarChar(100), username);
            userRequest.input('Password', sql.NVarChar(100), password);
            
            const userResult = await userRequest.execute('GetUserData');
            if (!userResult.recordset || userResult.recordset.length === 0) {
                 return res.json({ success: false, message: 'خطأ في جلب بيانات المستخدم' });
            }
            const user = userResult.recordset[0];

            // 3. التحقق من تطابق الدور
            // الآن نستخدم selectedRoleName القادم من الفرونت إند
            if (selectedRoleName && user.RoleNam) {
                const dbRole = user.RoleNam.trim();
                const selectedRole = selectedRoleName.trim();
                
                if (dbRole !== selectedRole) {
                    return res.json({
                        success: false,
                        roleMismatch: true,
                        message: 'الدور المختار غير مطابق لصلاحيات المستخدم'
                    });
                }
            }

            // 4. جلب اسم الشخص (تم وضعها داخل try-catch منفصلة لتجنب انهيار تسجيل الدخول)
            let personName = '';
            if (user.PersonID) {
                try {
                    const isStudent = user.RoleNam && user.RoleNam.includes('طالب');
                    // لو مش طالب، ممكن نمرر الـ PersonID نفسه أو قيمة تانية حسب تصميم الإجراء
                    // هنا هحاول تمرير الـ ID كـ SCHER لو الإجراء بيقبل كدة، أو نفرق الحالة
                    const scherParam = isStudent ? 'الطالب' : String(user.PersonID); 
                    
                    const personRequest = new sql.Request();
                    personRequest.input('SCHER', sql.NVarChar(100), scherParam);
                    personRequest.input('INPOT', sql.Int, 32);
                    
                    const personResult = await personRequest.execute('scher1');
                    
                    if (personResult.recordset && personResult.recordset.length > 0) {
                         // لو الإجراء بيرجع كل الناس، ندور على الـ ID
                        const person = personResult.recordset.find((p) => p.PersonID === user.PersonID);
                        if (person) {
                            personName = person.PersonName;
                        } else if (personResult.recordset[0]) {
                            // لو رجع شخص واحد فقط
                            personName = personResult.recordset[0].PersonName;
                        }
                    }
                } catch (err) {
                    console.error('Warning: Could not fetch person name, but continuing login.', err);
                    // نستمر والاسم يكون فارغ
                }
            }

            // 5. جلب اسم المدرسة
            let schoolName = '';
            if (user.SchoolID) {
                try {
                    const schoolRequest = new sql.Request();
                    schoolRequest.input('SchoolID', sql.Int, user.SchoolID);
                    const schoolResult = await schoolRequest.query('SELECT SchoolNam FROM SCHOOL WHERE SchoolID = @SchoolID');
                    
                    if (schoolResult.recordset && schoolResult.recordset.length > 0) {
                        schoolName = schoolResult.recordset[0].SchoolNam;
                    }
                } catch (err) {
                    console.error('Error fetching school name:', err);
                }
            }

            // 6. الرد النهائي
            res.json({
                success: true,
                message: 'تم تسجيل الدخول بنجاح',
                user: {
                    userId: user.UserId,
                    modriaId: user.ModriaID,
                    edaraId: user.EdaraID,
                    schoolId: user.SchoolID,
                    schoolName: schoolName, 
                    personId: user.PersonID,
                    personName: personName, // الاسم أو فارغ إذا فشل الجلب
                    role: user.RoleNam,
                    username: username,
                    lastSettings: {
                        mrahelId: user.CurrentMrahelID,
                        yerId: user.CurrentYerID,
                        schoolId: user.LastSchoolID
                    }
                }
            });
        } else {
            res.json({
                success: false,
                message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
            });
        }
    } catch (error) {
        console.error('Login Critical Error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ داخلي في السيرفر',
            error: error.message 
        });
    }
});
// API لجلب إعدادات المدرسة (العام والمرحلة) حسب رقم المدرسة
app.get('/api/school-settings', async (req, res) => {
    const { schoolId } = req.query;
    
    if (!schoolId) {
        return res.status(400).json({ success: false, message: 'رقم المدرسة (SchoolID) مطلوب' });
    }
    
    try {
        const request = new sql.Request();
        request.input('SchoolID', sql.Int, schoolId);
        const result = await request.execute('GetSchoolSettingsBySchoolId');
        
        // نرجع الصف الأول فقط إذا وجد، أو null
        res.json({ 
            success: true, 
            data: result.recordset[0] || null 
        });
    } catch (err) {
        console.error('خطأ في جلب الإعدادات:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// API لحفظ أو تحديث إعدادات المدرسة (العام والمرحلة)
// تغيير المسار ليكون واضح
app.post('/api/save-settings', async (req, res) => {
    // استقبال الـ userId من الفرونت إند
    const { userId, schoolId, mrahelId, yerId } = req.body;
    
    // التحقق من وجود المستخدم
    if (!userId) {
        return res.status(400).json({ 
            success: false, 
            message: 'UserId مطلوب للحفظ' 
        });
    }
    
    try {
        const request = new sql.Request();
        request.input('UserId', sql.Int, userId);    
        request.input('SchoolID', sql.Int, schoolId);
        request.input('MrahelID', sql.Int, mrahelId || null); 
        request.input('YerID', sql.Int, yerId);
        
        // تنفيذ الإجراء الجديد
        await request.execute('SaveStageAndYear');
        
        res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح' });
    } catch (err) {
        console.error('خطأ في حفظ الإعدادات:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// Endpoint عام لجلب البيانات بناءً على كود العملية
// مثال للاستخدام:
app.get('/api/getData1/:inpot', async (req, res) => {
    // 1. جلب كود العملية (INPOT) من الرابط
    const { inpot } = req.params; 
    const { id } = req.query;    
    try {
        const request = new sql.Request();
        
        // التعامل مع القيمة الفارغة (null) لو لم يتم إرسال id
        const schValue = id ? Number(id) : 0;

        // تمرير المتغيرات للإجراء المخزن
        request.input('sch', sql.Int, schValue);
        request.input('INPOT', sql.Int, Number(inpot));

        // تنفيذ الإجراء
        const result = await request.execute('SELCT_MAX_SUMTAB_sch_mrehl_yer');

        if (!result.recordset || result.recordset.length === 0) {
            return res.json({ success: true, data: [] });
        }

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (err) {
        console.error('Error executing SP:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
        // تقرير الوجهات الرئيسية و الفرعية 
app.get('/api/GETTKARERALLSCHOOL/:inpot', async (req, res) => {
    // 1. جلب كود العملية (INPOT) من الرابط
    const { inpot } = req.params; 
    const { id } = req.query;    
    try {
        const request = new sql.Request();
        
        // التعامل مع القيمة الفارغة (null) لو لم يتم إرسال id
        const schValue = id ? Number(id) : 0;

        // تمرير المتغيرات للإجراء المخزن
        request.input('sch', sql.Int, schValue);
        request.input('INPOT', sql.Int, Number(inpot));

        // تنفيذ الإجراء
        const result = await request.execute('GETTKARERALLSCHOOL');

        if (!result.recordset || result.recordset.length === 0) {
            return res.json({ success: true, data: [] });
        }

        res.json({
            success: true,
            data: result.recordset
        });
    } catch (err) {
        console.error('Error executing SP:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API جديد لاستدعاء scher5int (جلب الطلاب للتوزيع)
// ==========================================================
app.post('/api/search/scher5int', async (req, res) => {
    const { SCHER1, SCHER2, SCHER3, SCHER4, SCHER5, INPOT } = req.body;

    try {
        const request = new sql.Request();
        
        // تمرير المتغيرات بالترتيب المطلوب للـ Procedure
        request.input('SCHER1', sql.Int, SCHER1); // SchoolID
        request.input('SCHER2', sql.Int, SCHER2); // MrahelID
        request.input('SCHER3', sql.Int, SCHER3); // YearID
        request.input('SCHER4', sql.Int, SCHER4); // GradeID
        request.input('SCHER5', sql.Int, SCHER5); // SANEFID
        request.input('INPOT', sql.Int, INPOT);   // 1 = Select

        const result = await request.execute('scher5int');
        
        res.json({ 
            success: true, 
            data: result.recordset 
        });
    } catch (err) {
        console.error('Error in scher5int:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// حفظ / تعديل / حذف موظف
app.post('/api/employees', async (req, res) => {
  // === التعديل هنا ===
  // نستخدم ... (Rest Operator) لفصل "operation" عن باقي البيانات (التي تمثل الموظف)
  const { operation, ...employeeData } = req.body;
  // ===================

  try {
    const request = new sql.Request();

    // تحويل بيانات الموظف فقط (بدون operation) إلى JSON
    const employeeJSON = JSON.stringify(employeeData);

    request.input('EmployeeJSON', sql.NVarChar(sql.MAX), employeeJSON);
    
    // استخدام قيمة operation التي فصلناها
    request.input('INPOT', sql.Int, operation);

    await request.execute('INSER_UPDAT_DELETTAB_Emplwe_JSON');

    res.json({ success: true, message: 'تمت العملية بنجاح' });
  } catch (err) {
    console.error('Error saving employee:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================================
// 🔹 API عام لجلب بيانات الإجازات (أرصدة أو طلبات)
// يستخدم الإجراء SELCT_MAX_SUMTAB_sch_mrehl_yer2
// ==========================================================
app.get('/api/leaves/data', async (req, res) => {
    // 1. جلب القيم من الرابط
    let { schoolId, yearId, inpout } = req.query;

    // تحويل القيم لأرقام (مهم جداً لـ SQL Int)
    schoolId = parseInt(schoolId);
    yearId = parseInt(yearId);
    inpout = parseInt(inpout);

    if (!schoolId || !yearId || !inpout) {
        return res.status(400).json({ success: false, error: 'بيانات ناقصة' });
    }

    try {
        const request = new sql.Request();
        
        // 2. تمرير القيم للأجراء المخزن
        request.input('sch11', sql.Int, schoolId); 
        request.input('sch2', sql.Int, yearId);    
        request.input('INPOT', sql.Int, inpout); 

        // 3. تنفيذ الإجراء
        const result = await request.execute('SELCT_MAX_SUMTAB_sch_mrehl_yer2');
        
        // ✅✅✅ خطوة التصحيح الأخيرة
        // اطبع عدد الصفوف الراجعة في التيرمنال
        console.log(`School: ${schoolId} | INPOT: ${inpout} | Rows: ${result.recordset.length}`);

        res.json({ 
            success: true, 
            data: result.recordset 
        });
    } catch (err) {
        console.error('خطأ:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. حفظ / تعديل / حذف رصيد إجازة (Insert/Update/Delete)
// يستخدم الإجراء INSER_UPDAT_DELETTAB_8
app.post('/api/leaves/save', async (req, res) => {
    const { RasedID, EmploeID, YerID, NewBalance, AgazaNo, operation } = req.body;

    if (!EmploeID || !YerID || !NewBalance || !operation) {
        return res.status(400).json({ success: false, error: 'بيانات ناقصة (EmploeID, YerID, NewBalance, operation)' });
    }

    try {
        const request = new sql.Request();

        request.input('sch1', sql.Int, RasedID || 0);
        request.input('sch2', sql.Int, EmploeID);
        request.input('sch3', sql.Int, YerID);
        request.input('sch5', sql.Int, parseInt(NewBalance));
        request.input('sch7', sql.NVarChar(100), AgazaNo || 'اعتيادية');
        request.input('INPOT', sql.Int, operation);

        await request.execute('INSER_UPDAT_DELETTAB_8');

        res.json({ success: true, message: 'تمت العملية بنجاح' });
    } catch (err) {
        console.error('خطأ في حفظ الإجازات:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 1. حفظ / تعديل / تأكيد / حذف طلب الإجازة
// يستخدم الإجراء RequestVacation
app.post('/api/leaves/request', async (req, res) => {
    const { TlabAgazaID, EmploeID, AgazaNo, dtpStartDate, dtpEndDate, txtDuration, AgazaType, YerID, operation } = req.body;

    if (!EmploeID || !dtpStartDate || !dtpEndDate || !txtDuration || !YerID || !operation) {
        return res.status(400).json({ success: false, error: 'بيانات ناقصة' });
    }

    try {
        const request = new sql.Request();

        request.input('TlabAgazaID', sql.Int, TlabAgazaID || 0);
        request.input('EmploeID', sql.Int, EmploeID);
        request.input('AgazaNo', sql.NVarChar(50), AgazaNo);
        request.input('dtpStartDate', sql.Date, dtpStartDate);
        request.input('dtpEndDate', sql.Date, dtpEndDate);
        request.input('txtDuration', sql.Int, parseInt(txtDuration));
        request.input('AgazaType', sql.NVarChar(50), AgazaType || null);
        request.input('YerID', sql.Int, YerID);
        request.input('INPOT', sql.Int, operation);

        await request.execute('RequestVacation');

        res.json({ success: true, message: 'تمت العملية بنجاح' });
    } catch (err) {
        console.error('خطأ في طلب الإجازة:', err);
        // === التعديل: إزالة as any و as Error ===
        const errorMessage = err.original?.info?.message || err.message;
        res.status(500).json({ success: false, error: errorMessage });
    }
});
// ==========================================================
// 🔹 API عام للبحث المعقد (scher_2int1nvr)
// ==========================================================
app.get('/api/search/complex', async (req, res) => {
    const { sch1, sch2, sch3, inpout } = req.query;

    if (!sch1 || !sch2 || !inpout) {
        return res.status(400).json({ success: false, error: 'المعلمات sch1, sch2, inpout مطلوبة' });
    }

    try {
        const request = new sql.Request();
        
        // تحويل القيم النصية من الـ Query إلى أرقام
        request.input('SCHER1', sql.Int, parseInt(sch1)); 
        request.input('SCHER2', sql.Int, parseInt(sch2)); 
        request.input('SCHER3', sql.NVarChar(100), sch3 || '');
        
        // === التعديل هنا: إزالة as string ===
        request.input('INPOT', sql.Int, parseInt(inpout)); 

        const result = await request.execute('scher_2int1nvr');
        
        res.json({ 
            success: true, 
            data: result.recordset 
        });
    } catch (err) {
        console.error('خطأ في البحث المعقد:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// 4. حفظ / تعديل / حذف إذن
app.post('/api/permissions/save', async (req, res) => {
    let { 
        PermissionID, EmploeID, PermissionType, PermissionDate, 
        StartTime, EndTime, PermissionDuration, PermissionStatus, 
        YerID, operation 
    } = req.body;

    if (!EmploeID || !PermissionType || !PermissionDate || !StartTime || !EndTime || !operation) {
        return res.status(400).json({ success: false, error: 'البيانات ناقصة.' });
    }

    // دالة تنظيف الوقت (للتأكد من الصيغة HH:mm:ss)
    const cleanTime = (t) => {
        if (!t) return null;
        const s = String(t);
        
        if (s.includes('T')) {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
                const h = d.getHours().toString().padStart(2, '0');
                const m = d.getMinutes().toString().padStart(2, '0');
                const sc = d.getSeconds().toString().padStart(2, '0');
                return `${h}:${m}:${sc}`;
            }
        }
        if (s.includes('-')) return null; 
        if (s.length === 5) return `${s}:00`;
        if (s.length === 8) return s;
        return s;
    };

    try {
        const request = new sql.Request();
        
        const finalStart = cleanTime(StartTime);
        const finalEnd = cleanTime(EndTime);

        console.log('Saving Time:', finalStart, ' - ', finalEnd);

        if (!finalStart || !finalEnd) {
             return res.status(400).json({ success: false, error: 'صيغة الوقت غير صحيحة.' });
        }

        request.input('PermissionID', sql.Int, PermissionID || 0);
        request.input('EmploeID', sql.Int, EmploeID);
        request.input('PermissionType', sql.NVarChar(50), PermissionType);
        request.input('PermissionDate', sql.Date, PermissionDate);
        
        // هذا يتخطى خطأ الـ tedious validation ويترك SQL Server يقوم بالتحويل التلقائي
        request.input('StartTime', sql.NVarChar(50), finalStart);
        request.input('EndTime', sql.NVarChar(50), finalEnd);
        
        request.input('PermissionDuration', sql.NVarChar(50), PermissionDuration);
        request.input('PermissionStatus', sql.NVarChar(50), PermissionStatus);
        request.input('YerID', sql.Int, YerID);
        request.input('INPOT', sql.Int, operation);

        await request.execute('ManagePermissions');
        res.json({ success: true, message: 'تمت العملية بنجاح' });
    } catch (err) {
        console.error('SQL Error:', err);
         res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/training/save', async (req, res) => {
    const { 
        TrainingID, EmploeID, TrainingStartDate, TrainingEndDate, 
        TrainingModa, TrainingPlaes, TrainingName, YerID, operation 
    } = req.body;

    try {
        const request = new sql.Request();
        
        // تعريف المتغيرات كما في الإجراء المخزن INSER_UPDAT_DELETTAB_4INT_2DAT_2NVA
        request.input('sch1', sql.Int, TrainingID || 0);       // ID
        request.input('sch2', sql.Int, EmploeID);              // EmploeID
        request.input('sch3', sql.Date, TrainingStartDate);    // StartDate
        request.input('sch4', sql.Date, TrainingEndDate);      // EndDate
        request.input('sch5', sql.Int, TrainingModa);          // Duration
        request.input('sch6', sql.NVarChar(100), TrainingPlaes); // Place
        request.input('sch7', sql.NVarChar(150), TrainingName); // Name
        request.input('sch8', sql.Int, YerID);                 // YearID
        request.input('INPOT', sql.Int, operation);            // 1, 2, 3

        await request.execute('INSER_UPDAT_DELETTAB_4INT_2DAT_2NVA');

        res.json({ success: true, message: 'تمت العملية بنجاح' });
    } catch (err) {
        console.error('خطأ في حفظ التدريب:', err);
        // التحقق من رسالة الخطأ القادمة من SQL
        if (err.originalError && err.originalError.message.includes('تدريب مسجل بالفعل')) {
             res.status(400).json({ success: false, error: 'هذا الموظف لديه تدريب مسجل بالفعل في هذه الفترة.' });
        } else {
             res.status(500).json({ success: false, error: err.message });
        }
    }
});
app.post('/api/penalty/save', async (req, res) => {
    const { palanetID, EmploeID, PalaentDAte, NoPalantID, PalantModa, PalanetSabb, PalaentSatse, YerID, operation } = req.body;

    try {
        const pool = await sql.connect(dbConfig); // تأكد من إعداد dbConfig
        const request = pool.request(); // إنشاء request جديد

        // تحويل البيانات للـ SQL procedure
        request.input('sch1', sql.Int, palanetID || 0);
        request.input('sch2', sql.Int, EmploeID);
        request.input('sch3', sql.Date, PalaentDAte);
        request.input('sch4', sql.Int, NoPalantID);
        request.input('sch5', sql.Int, PalantModa);
        request.input('sch6', sql.NVarChar(250), PalanetSabb);
        request.input('sch7', sql.NVarChar(50), PalaentSatse);
        request.input('sch8', sql.Int, YerID);
        request.input('INPOT', sql.Int, operation);

        await request.execute('INSER_UPDAT_DELETTAB_6INT_1DAT_2NVA');

        res.json({ success: true, message: 'تمت العملية بنجاح' });
    } catch (err) {
        console.error('خطأ في حفظ الجزاء:', err);
        if (err.originalError && err.originalError.message.includes('جزاء مسجل بالفعل')) {
            res.status(400).json({ success: false, error: 'هذا الموظف لديه جزاء مسجل بالفعل في هذه الفترة.' });
        } else {
            res.status(500).json({ success: false, error: err.message });
        }
    }
});

// ==========================================================
// 🔹 API لإحصاء الموظفين (GetEmployeeStatistics)
// ==========================================================
app.get('/api/statistics', async (req, res) => {
    const { statisticType, startDate, endDate, schoolId, yearId, inpot, stageId } = req.query;

    if (!schoolId || !yearId || !startDate || !endDate) {
        return res.status(400).json({ success: false, error: 'المدخلات غير مكتملة' });
    }

    try {
        const request = new sql.Request();
        request.input('StatisticType', sql.NVarChar(50), statisticType);
        // استخدام DateTime لتتوافق مع تعريف الإجراء
        request.input('StartDate', sql.DateTime, new Date(startDate)); 
        request.input('EndDate', sql.DateTime, new Date(endDate));
        request.input('SchoolID', sql.Int, parseInt(schoolId));
        request.input('YearID', sql.Int, parseInt(yearId));
        request.input('INPOT', sql.Int, parseInt(inpot));
        
        // إضافة StageID لأن الإجراء الجديد (21) يحتاجه، ولن يضر الإجراء القديم (12)
        request.input('StageID', sql.Int, stageId ? parseInt(stageId) : 0);

        const result = await request.execute('GetEmployeeStatistics');

        // ⚠️ التعديل الأهم: استخدام recordsets (جمع) بدلاً من recordset (مفرد)
        // هذا سيجعل result.data عبارة عن مصفوفة تحتوي على [الملخص, التفاصيل]
        res.json({ success: true, data: result.recordsets });
    } catch (err) {
        console.error('Error in statistics API:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// API لجلب تقرير حركة المواد / الإجازات حسب INPOT
app.get('/api/item-movement', async (req, res) => {
    const { sche, sche1, startDate, endDate, inpot } = req.query;

    if (!sche || !sche1 || !inpot) {
        return res.status(400).json({ 
            success: false, 
            error: 'المعلمات sche, sche1 و inpot مطلوبة' 
        });
    }

    try {
        const request = new sql.Request();
        request.input('sche', sql.Int, parseInt(sche));
        request.input('sche1', sql.Int, parseInt(sche1));
        request.input('StartDate', sql.Date, startDate || null);
        request.input('EndDate', sql.Date, endDate || null);
        request.input('INPOT', sql.Int, parseInt(inpot));

        const result = await request.execute('GetItemMovementReport');

        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('خطأ في جلب تقرير الحركة:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API تقرير المستحقين لصرف المرتب (GetMonthlyLeaveStats)
// ==========================================================
app.get('/api/monthly-stats', async (req, res) => {
    const { startDate, endDate, schoolId, yearId, minDays, inpot, jopFilter } = req.query;

    if (!startDate || !endDate || !schoolId || !yearId || !minDays) {
        return res.status(400).json({ success: false, error: 'جميع المعلمات مطلوبة (تواريخ، مدرسة، عام، الحد الأدنى)' });
    }

    try {
        const request = new sql.Request();
        
        request.input('StartDate', sql.Date, startDate);
        request.input('EndDate', sql.Date, endDate);
        request.input('SchoolID', sql.Int, parseInt(schoolId));
        request.input('YearID', sql.Int, parseInt(yearId));
        request.input('MinDays', sql.Int, parseInt(minDays));
        request.input('INPOT', sql.Int, parseInt(inpot || '1'));
        request.input('JopStatsFilter', sql.NVarChar(50), jopFilter || 'الكل');

        const result = await request.execute('GetMonthlyLeaveStats');

        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('خطأ في تقرير المستحقين:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API تسجيل طلاب جدد (التقديم للمدرسة)
// ==========================================================
app.get('/api/students/tsgel', async (req, res) => {
    const { schoolId, yearId } = req.query;

    if (!schoolId || !yearId) {
        return res.status(400).json({ success: false, error: 'يرجى توفير SchoolID و YearID' });
    }

    try {
        const request = new sql.Request();
        
        // جلب البيانات من جدول الطلاب المقدمين
        request.input('schoolId', sql.Int, schoolId);
        request.input('yearId', sql.Int, yearId);
        
        // تنفيذ الاستعلام
        const result = await request.query(`
            SELECT * FROM [dbo].[STUD_Tsgel]
            WHERE SchoolID = @schoolId AND YerID = @yearId
            ORDER BY StudentID1 DESC
        `);

        res.json({ 
            success: true, 
            data: result.recordset 
        });
    } catch (err) {
        console.error('خطأ في جلب طلاب التقديم:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 2. إضافة / تعديل / حذف طالب (POST)
// يستخدم الإجراء المخزن INSER_UPDAT_DELETTAB12
app.post('/api/students/tsgel', async (req, res) => {
    // استخراج البيانات من الـ body
    const { 
        StudentID1, // ID
        StudentCode, // sch2
        StudName,   // sch3
        NationalNumber, // sch4
        NaweiatAlaedadia, // sch5
        MiddleSchool, // sch6
        DarajatAlaedadia, // sch7
        YearObtained, // sch8
        StudFazer,   // sch9
        TeleFazer,   // sch10
        EmailFazer,  // sch11
        SchoolID,    // sch12
        YerID,       // sch13
        INPOT        // 1=إضافة, 2=تعديل, 3=حذف
    } = req.body;

    // التحقق من البيانات الأساسية
    if (!SchoolID || !YerID || !INPOT) {
        return res.status(400).json({ success: false, error: 'البيانات الأساسية (SchoolID, YerID, INPOT) مطلوبة' });
    }

    try {
        const request = new sql.Request();

        // ربط البيانات بالمعاملات الخاصة بالإجراء المخزن
        request.input('sch1', sql.Int, StudentID1 || 0);       // StudentID1
        request.input('sch2', sql.NVarChar(50), StudentCode || ''); // StudentCode
        request.input('sch3', sql.NVarChar(250), StudName || '');   // StudName
        request.input('sch4', sql.NVarChar(50), NationalNumber || ''); // NationalNumber
        request.input('sch5', sql.NVarChar(50), NaweiatAlaedadia || ''); // NaweiatAlaedadia
        request.input('sch6', sql.NVarChar(100), MiddleSchool || ''); // MiddleSchool
        request.input('sch7', sql.NVarChar(50), DarajatAlaedadia || ''); // DarajatAlaedadia
        request.input('sch8', sql.NVarChar(50), YearObtained || ''); // YearObtained
        request.input('sch9', sql.NVarChar(200), StudFazer || ''); // StudFazer
        request.input('sch10', sql.NVarChar(50), TeleFazer || ''); // TeleFazer
        request.input('sch11', sql.NVarChar(200), EmailFazer || ''); // EmailFazer
        request.input('sch12', sql.Int, SchoolID);             // SchoolID
        request.input('sch13', sql.Int, YerID);                // YerID
        request.input('INPOT', sql.Int, parseInt(INPOT));      // 1, 2, 3

        // تنفيذ الإجراء المخزن
        await request.execute('INSER_UPDAT_DELETTAB12');

        const message = INPOT === 3 ? 'تم الحذف بنجاح' : 'تم الحفظ بنجاح';
        res.json({ success: true, message: message });
        
    } catch (err) {
        console.error('خطأ في حفظ بيانات الطالب:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API للتقارير والإحصائيات المعقدة (scher2int)
// ==========================================================
app.get('/api/search/scher2int', async (req, res) => {
    const { sch1, sch2, inpot } = req.query;

    // التحقق من وجود المدخلات المطلوبة
    if (sch1 === undefined || sch2 === undefined || !inpot) {
        return res.status(400).json({ success: false, error: 'المعلمات sch1, sch2, inpot مطلوبة' });
    }

    try {
        const request = new sql.Request();
        
        // تمرير المتغيرات للإجراء المخزن
        // ملاحظة: الإجراء يتوقع int لـ SCHER1 و SCHER2
        request.input('SCHER1', sql.Int, parseInt(sch1)); 
        request.input('SCHER2', sql.Int, parseInt(sch2)); 
        request.input('INPOT', sql.Int, parseInt(inpot)); 

        const result = await request.execute('scher2int');
        
        // التعامل مع النتائج
        // بعض الحالات (مثل 14, 15, 16, 18) ترجع جدولين (Recordsets)
        if (result.recordsets && result.recordsets.length > 1) {
            res.json({ 
                success: true, 
                data: result.recordsets[0],  // الجدول الأول
                data2: result.recordsets[1]  // الجدول الثاني (إن وجد)
            });
        } else {
            res.json({ 
                success: true, 
                data: result.recordset 
            });
        }
    } catch (err) {
        console.error('خطأ في تنفيذ scher2int:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API لحفظ درجات طلاب القبول (scher5int - INPOT 2)
// ==========================================================
app.post('/api/exams/save', async (req, res) => {
    // استخراج البيانات من الـ Body
    const { studentId, grade1, grade2, grade3, passingGrade } = req.body;
    
    // نوع العملية ثابت = 2 (حفظ/تعديل درجات)
    const operation = 2; 

    // التحقق من البيانات الأساسية
    if (!studentId || grade1 === undefined || grade2 === undefined || grade3 === undefined) {
        return res.status(400).json({ 
            success: false, 
            error: 'البيانات ناقصة: يرجى إرسال رقم الطالب والدرجات الثلاث' 
        });
    }

    try {
        const request = new sql.Request();
        
        // تنظيف القيم وتحويلها لأرقام (مع التعامل مع القيم الفارغة كـ 0)
        const g1 = (grade1 !== '' && grade1 !== null) ? parseInt(grade1) : 0;
        const g2 = (grade2 !== '' && grade2 !== null) ? parseInt(grade2) : 0;
        const g3 = (grade3 !== '' && grade3 !== null) ? parseInt(grade3) : 0;
        // درجة النجاح الافتراضية 50 إذا لم يتم إرسالها
        const passGrade = passingGrade ? parseInt(passingGrade) : 50;

        // تمرير المتغيرات للإجراء المخزن scher5int
        request.input('SCHER1', sql.Int, parseInt(studentId)); // StudentID1
        request.input('SCHER2', sql.Int, g1);                 // DrgaExamK1Name (الدرجة الأولى)
        request.input('SCHER3', sql.Int, g2);                 // DrgaExamK2Name (الدرجة الثانية)
        request.input('SCHER4', sql.Int, g3);                 // DrgaExamKName  (المجموع/الدرجة الثالثة)
        request.input('SCHER5', sql.Int, passGrade);          // PassingAverage (حد النجاح)
        request.input('INPOT', sql.Int, operation);           // 2 = حفظ

        // تنفيذ الحفظ
        await request.execute('scher5int');

        res.json({ success: true, message: 'تم حفظ الدرجات وتحديث حالة الطالب بنجاح' });
        
    } catch (err) {
        console.error('خطأ في حفظ الدرجات:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API استلام الملفات (TSLEMFAIELL)
// يستخدم الإجراء المخزن INSER_UPDAT_DELETTAB13
// ==========================================================
app.post('/api/files', async (req, res) => {
    const { 
        FiellId,       // sch1
        StudentID1,    // sch2
        BirthCSTat,    // sch3
        PrepScStat,    // sch4
        StudPhotoS,    // sch5
        Application,   // sch6
        EkraratSt,     // sch7
        EkraratSt1,    // sch8
        EkraratSt2,    // sch9
        INPOT          // 1=إضافة, 2=تعديل
    } = req.body;

    // التحقق من البيانات الأساسية
    if (!StudentID1 || !INPOT) {
        return res.status(400).json({ 
            success: false, 
            message: 'البيانات الأساسية (رقم الطالب ونوع العملية) مطلوبة' 
        });
    }

    try {
        const request = new sql.Request();

        // ربط المتغيرات مع الإجراء المخزن INSER_UPDAT_DELETTAB13
        request.input('sch1', sql.Int, FiellId || 0);           // FiellId
        request.input('sch2', sql.Int, StudentID1);             // StudentID1
        request.input('sch3', sql.NVarChar(50), BirthCSTat || '');   // شهادة الميلاد
        request.input('sch4', sql.NVarChar(50), PrepScStat || '');   // صورة الطالب
        request.input('sch5', sql.NVarChar(50), StudPhotoS || '');   // اقرارات القبول
        request.input('sch6', sql.NVarChar(50), Application || '');  // طلب الالتحاق
        request.input('sch7', sql.NVarChar(50), EkraratSt || '');    // الدمغات
        request.input('sch8', sql.NVarChar(50), EkraratSt1 || '');   // صور البطايق
        request.input('sch9', sql.NVarChar(50), EkraratSt2 || '');   // حافظات
        request.input('INPOT', sql.Int, parseInt(INPOT));        // نوع العملية

        // تنفيذ الإجراء
        await request.execute('INSER_UPDAT_DELETTAB13');

        const message = INPOT === 2 ? 'تم تحديث الملف بنجاح' : 'تم تسجيل الملف بنجاح';
        res.json({ success: true, message: message });

    } catch (err) {
        console.error('خطأ في حفظ ملف الطالب:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API ترحيل الطالب إلى جدول الطلاب الرسمي (InsertNewStudent)
// يقوم بنقل البيانات من جدول التسجيل (STUD_Tsgel) إلى جدول الطلاب (STUDENT)
// ==========================================================
app.post('/api/students/admit', async (req, res) => {
    const { StudentID1, MrahelID } = req.body;

    // التحقق من وجود الرقم الطالب والمرحلة
    if (!StudentID1 || !MrahelID) {
        return res.status(400).json({ 
            success: false, 
            message: 'يرجى إرسال رقم الطالب (StudentID1) ورقم المرحلة (MrahelID)' 
        });
    }

    try {
        const request = new sql.Request();

        // تمرير المعاملات للإجراء المخزن
        request.input('StudentID1', sql.Int, StudentID1);
        request.input('MrahelID', sql.Int, MrahelID);

        // تنفيذ الإجراء
        await request.execute('InsertNewStudent');

        res.json({ 
            success: true, 
            message: 'تم ترحيل الطالب وإضافته لجدول الطلاب بنجاح' 
        });

    } catch (err) {
        console.error('خطأ في ترحيل الطالب:', err);
        
        // التعامل مع رسالة الخطأ القادمة من SQL (RAISERROR)
        // رسالة الإجراء: 'حالة استلام الملفات غير مؤكدة. لا يمكن إضافة الطالب.'
        const errorMessage = err.originalError?.message || err.message;
        
        res.status(500).json({ 
            success: false, 
            message: errorMessage 
        });
    }
});

// ==========================================================
// 🔹 API توزيع الطلاب على الفصول
// ==========================================================
app.post('/api/students/distribute', async (req, res) => {
    const {
        schoolId,
        mrahelId,
        gereadId,
        yearId,
        studentsPerClass,
        distributionMethod,
        shoabaId // ✅ أضفنا الشعبة
    } = req.body;

    // التحقق من البيانات
    if (!schoolId || !mrahelId || !gereadId || !yearId || !studentsPerClass || !distributionMethod) {
        return res.status(400).json({
            success: false,
            error: 'البيانات ناقصة'
        });
    }

    try {
        const request = new sql.Request();

        request.input('SchoolID', sql.Int, schoolId);
        request.input('MrahelID', sql.Int, mrahelId);
        request.input('GereadID', sql.Int, gereadId);
        request.input('YearID', sql.Int, yearId);
        request.input('StudentsPerClass', sql.Int, studentsPerClass);
        request.input('DistributionMethod', sql.NVarChar(50), distributionMethod);
        request.input('ShoabaID', sql.Int, shoabaId || null); // ✅ أضفنا الباراميتر

        const result = await request.execute('DistributeStudents');

        res.json({
            success: true,
            message: shoabaId ? 'تم التوزيع الآلي داخل الشعبة بنجاح' : 'تم التوزيع الآلي بنجاح',
            data: result.recordset
        });

    } catch (err) {
        console.error('خطأ في توزيع الطلاب:', err);

        res.status(500).json({
            success: false,
            error: err.original?.info?.message || err.message
        });
    }
});

// ==========================================================
// 🔹 API تنفيذ إجراء INSER_UPDAT_DELETTAB_3int
// ==========================================================
app.post('/api/manage-three-int', async (req, res) => {
    const { sch1, sch2, sch3, input } = req.body;

    // تحقق من البيانات
    if (sch1 == null || sch2 == null || sch3 == null || input == null) {
        return res.status(400).json({
            success: false,
            error: 'البيانات ناقصة'
        });
    }

    try {
        const request = new sql.Request();

        request.input('sch1', sql.Int, sch1);
        request.input('sch2', sql.Int, sch2);
        request.input('sch3', sql.Int, sch3);
        request.input('INPOT', sql.Int, input);

        await request.execute('INSER_UPDAT_DELETTAB_3int');

        res.json({
            success: true,
            message: 'تم تنفيذ العملية بنجاح'
        });

    } catch (err) {
        console.error('خطأ في تنفيذ الإجراء:', err);

        res.status(500).json({
            success: false,
            error: err.original?.info?.message || err.message
        });
    }
});

app.post('/api/student', async (req, res) => {
  try {
    const body = req.body;

    // ✅ حل مشكلة اختلاف الاسم
    const StudentID = body.StudentID || body['الرقم'];

    const {
      SchoolID,
      MrahelID,
      YerID,
      GereadID,
      ShoabaID,
      ClasesID,
      CoedSTUD,
      RkemStudKawme,
      BarsDay,
      MohafzaBars,
      StudentTyb,
      StudentDiana,
      StudentNadchnalte,
      Day,
      Monses,
      Yeair,
      ArbStudName,
      EngStudName,
      StudentAdres,
      StudEnAdres,
      StudentEmail,
      FazesName,
      FazerKawme,
      FazerTele,
      FazerJop,
      MazerNam,
      MazerKwme,
      MazerTele,
      MazerJop,
      WElaeaTElem,
      HaletKeaed,
      HelseStud,
      Masrwfat,
      language_won,
      language_two,
      stud_img,
      ST_Status,
      INPOT
    } = body;

    const request = new sql.Request();

    // =========================
    // ✅ Helpers
    // =========================
    const toIntOrNull = (value) => {
      return value !== undefined && value !== null && value !== ""
        ? Number(value)
        : null;
    };

    const toStringOrNull = (value) => {
      return value !== undefined && value !== null && value !== ""
        ? String(value)
        : null;
    };

    // =========================
    // ✅ معالجة الصورة
    // =========================
    let imgBuffer = null;
    if (stud_img && typeof stud_img === 'string') {
      let base64Data = stud_img;
      if (base64Data.includes(',')) {
        base64Data = base64Data.split(',')[1];
      }
      imgBuffer = Buffer.from(base64Data, 'base64');
    }

    // =========================
    // ✅ Inputs (الأرقام)
    // =========================
    request.input("StudentID", sql.Int, toIntOrNull(StudentID) || 0);
    request.input("SchoolID", sql.Int, toIntOrNull(SchoolID));
    request.input("MrahelID", sql.Int, toIntOrNull(MrahelID));
    request.input("YerID", sql.Int, toIntOrNull(YerID));
    request.input("GereadID", sql.Int, toIntOrNull(GereadID));
    request.input("ShoabaID", sql.Int, toIntOrNull(ShoabaID)); // ✅ يقبل NULL
    request.input("ClasesID", sql.Int, toIntOrNull(ClasesID));
    request.input("INPOT", sql.Int, toIntOrNull(INPOT) || 1);

    // =========================
    // ✅ Strings
    // =========================
    request.input("CoedSTUD", sql.NVarChar, toStringOrNull(CoedSTUD));
    request.input("RkemStudKawme", sql.NVarChar, toStringOrNull(RkemStudKawme));
    request.input("MohafzaBars", sql.NVarChar, toStringOrNull(MohafzaBars));
    request.input("StudentTyb", sql.NVarChar, toStringOrNull(StudentTyb));
    request.input("StudentDiana", sql.NVarChar, toStringOrNull(StudentDiana));
    request.input("StudentNadchnalte", sql.NVarChar, toStringOrNull(StudentNadchnalte));
    request.input("Day", sql.NVarChar, toStringOrNull(Day));
    request.input("Monses", sql.NVarChar, toStringOrNull(Monses));
    request.input("Yeair", sql.NVarChar, toStringOrNull(Yeair));
    request.input("ArbStudName", sql.NVarChar, toStringOrNull(ArbStudName));
    request.input("EngStudName", sql.NVarChar, toStringOrNull(EngStudName));
    request.input("StudentAdres", sql.NVarChar, toStringOrNull(StudentAdres));
    request.input("StudEnAdres", sql.NVarChar, toStringOrNull(StudEnAdres));
    request.input("StudentEmail", sql.NVarChar, toStringOrNull(StudentEmail));
    request.input("FazesName", sql.NVarChar, toStringOrNull(FazesName));
    request.input("FazerKawme", sql.NVarChar, toStringOrNull(FazerKawme));
    request.input("FazerTele", sql.NVarChar, toStringOrNull(FazerTele));
    request.input("FazerJop", sql.NVarChar, toStringOrNull(FazerJop));
    request.input("MazerNam", sql.NVarChar, toStringOrNull(MazerNam));
    request.input("MazerKwme", sql.NVarChar(50), toStringOrNull(MazerKwme));
    request.input("MazerTele", sql.NVarChar, toStringOrNull(MazerTele));
    request.input("MazerJop", sql.NVarChar, toStringOrNull(MazerJop));
    request.input("WElaeaTElem", sql.NVarChar, toStringOrNull(WElaeaTElem));
    request.input("HaletKeaed", sql.NVarChar, toStringOrNull(HaletKeaed));
    request.input("HelseStud", sql.NVarChar, toStringOrNull(HelseStud));
    request.input("Masrwfat", sql.NVarChar, toStringOrNull(Masrwfat));
    request.input("language_won", sql.NVarChar, toStringOrNull(language_won));
    request.input("language_two", sql.NVarChar, toStringOrNull(language_two));
    request.input("ST_Status", sql.NVarChar, toStringOrNull(ST_Status));

    // =========================
    // ✅ Date
    // =========================
    request.input("BarsDay", sql.Date, BarsDay || null);

    // =========================
    // ✅ Image
    // =========================
    request.input("stud_img", sql.VarBinary(sql.MAX), imgBuffer);

    // =========================
    // ✅ Execute
    // =========================
    const result = await request.execute("INSER_UPDAT_DELETTAB_STUDENT");

    // =========================
    // ✅ Handle SQL Errors
    // =========================
    if (
      result.recordset &&
      result.recordset.length > 0 &&
      result.recordset[0].ErrorMessage
    ) {
      return res.status(400).json({
        success: false,
        message: "خطأ في قاعدة البيانات: " + result.recordset[0].ErrorMessage
      });
    }

    // =========================
    // ✅ Success
    // =========================
    res.status(200).json({
      success: true,
      message: "تمت العملية بنجاح",
      data: result.recordset
    });

  } catch (err) {
    console.error("Server Crash:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
// ==========================================================
// 🔹 API تسجيل / تعديل غياب طالب
// يستخدم الإجراء INSER_UPDAT_DELETTAB_sch_dat
// ==========================================================
app.post('/api/students/absent', async (req, res) => {
    const { studentId, absentDate, absentHala, inpout } = req.body;

    if (!studentId || !absentDate || !inpout) {
        return res.status(400).json({
            success: false,
            error: 'البيانات ناقصة (studentId, absentDate, inpout مطلوبة)'
        });
    }

    try {
        const request = new sql.Request();

        request.input('sch1', sql.Int, studentId);              // StudentID
        request.input('sch2', sql.Date, absentDate);            // AbsentDate
        request.input('sch3', sql.NVarChar(50), absentHala );
        request.input('INPOT', sql.Int, parseInt(inpout));

        // 🔹 Output Parameters
        request.output('StudentName', sql.NVarChar(100));
        request.output('SchoolName', sql.NVarChar(100));

        const result = await request.execute('INSER_UPDAT_DELETTAB_sch_dat');

        res.json({
            success: true,
            status: result.returnValue, // 1 إدخال - 2 تعديل
            studentName: result.output.StudentName || null,
            schoolName: result.output.SchoolName || null
        });

    } catch (err) {
        console.error('خطأ في تسجيل الغياب:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
// ==========================================================
// 🔹 API إضافة إنذار طالب
// ==========================================================
app.post('/api/warnings/add', async (req, res) => {
    const {
        StudentID,
        WarningDate,
        TotalAbsenceDays,
        WarningType,
        LastWarningDate,
        Notes
    } = req.body;

    // التحقق من البيانات الأساسية
    if (!StudentID || !WarningDate || !WarningType) {
        return res.status(400).json({
            success: false,
            message: 'البيانات الأساسية ناقصة (StudentID, WarningDate, WarningType)'
        });
    }

    try {
        const request = new sql.Request();

        // 🟢 المدخلات العادية
        request.input('StudentID', sql.Int, StudentID);
        request.input('WarningDate', sql.Date, WarningDate);
        request.input('TotalAbsenceDays', sql.Int, TotalAbsenceDays || 0);
        request.input('WarningType', sql.NVarChar(50), WarningType);
        request.input('LastWarningDate', sql.Date, LastWarningDate || null);
        request.input('Notes', sql.NVarChar(255), Notes || '');

        // 🟣 المتغيرات الـ OUTPUT
        request.output('StudentName', sql.NVarChar(100));
        request.output('SchoolName', sql.NVarChar(100));

        // تنفيذ الإجراء المخزن
        const result = await request.execute('AddWarning');

        res.json({
            success: true,
            message: 'تم تسجيل الإنذار بنجاح',
            data: {
                studentName: result.output.StudentName,
                schoolName: result.output.SchoolName
            }
        });

    } catch (err) {
        console.error('خطأ في إضافة الإنذار:', err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});
// === Endpoint لتسجيل المخالفات (مصحح للتعديل والحذف) ===
app.post('/api/students/violation', async (req, res) => {
    const {
        ViolationID,
        StudentID,
        ViolationDescription,
        ViolationDate,
        ParentContacted,
        PunishmentDescription,
        PunishmentStatus,
        ConfirmedByPrincipal,
        INPOT
    } = req.body;

    // 1. التحقق من رقم العملية
    if (INPOT === undefined) {
        return res.status(400).json({ success: false, error: 'INPOT is required' });
    }

    // 2. التحقق من البيانات حسب نوع العملية
    if (INPOT === 1) {
        // إضافة: نحتاج كل البيانات الأساسية
        if (!ViolationID || !StudentID || !ViolationDescription || !ViolationDate) {
            return res.status(400).json({ success: false, error: 'Missing required fields for Insert' });
        }
    } else if (INPOT === 2 || INPOT === 3) {
        // تعديل أو حذف: نحتاج رقم المخالفة فقط (الإجراء المخزن يتكفل بالباقي)
        if (!ViolationID) {
            return res.status(400).json({ success: false, error: 'ViolationID required' });
        }
    }

    try {
        const request = new sql.Request();

        // تمرير البيانات (الـ SQL هيتعامل مع الـ NULL بشكل صحيح)
        request.input('ViolationID', sql.Int, ViolationID || 0);
        
        // لو StudentID مش موجود (في حالة التعديل/الحذف)، نرسل null
        request.input('StudentID', sql.Int, StudentID || null); 
        
        request.input('ViolationDescription', sql.NVarChar(sql.MAX), ViolationDescription || '');
        request.input('ViolationDate', sql.Date, ViolationDate || null);
        request.input('ParentContacted', sql.Bit, ParentContacted ? 1 : 0);
        request.input('PunishmentDescription', sql.NVarChar(sql.MAX), PunishmentDescription || '');
        request.input('PunishmentStatus', sql.NVarChar(50), PunishmentStatus || '');
        request.input('ConfirmedByPrincipal', sql.Bit, ConfirmedByPrincipal ? 1 : 0);
        request.input('INPOT', sql.Int, INPOT);

        request.output('StudentName', sql.NVarChar(100));
        request.output('SchoolName', sql.NVarChar(100));

        const result = await request.execute('InsertViolation');

        return res.json({
            success: true,
            studentName: result.output.StudentName || '',
            schoolName: result.output.SchoolName || ''
        });

    } catch (err) {
        console.error('SQL Error:', err);
        return res.status(500).json({ success: false, error: err.message || 'Database error' });
    }
});
// ==========================================================
// 🔹 API تسجيل إذن خروج طالب (إضافة / تعديل / حذف)
// ==========================================================
app.post('/api/students/exit-permit', async (req, res) => {
    const {
        EzenStudID,    // sch1 (رقم الإذن)
        StudentID,     // sch2 (رقم الطالب)
        EzenStudDate,  // sch3 (التاريخ)
        EzenStudTime,  // sch4 (الوقت)
        EzenStudSabb,  // sch5 (السبب)
        EzenStudNo,    // sch6 (عدد الأذونات - للتغيير اليدوي لو لزم)
        YerID,         // sch7 (رقم العام الدراسي)
        INPOT          // نوع العملية: 1=إضافة, 2=تعديل, 3=حذف
    } = req.body;

    // التحقق من وجود رقم العملية
    if (INPOT === undefined) {
        return res.status(400).json({ success: false, error: 'INPOT is required' });
    }

    try {
        const request = new sql.Request();

        // ربط المتغيرات مع الإجراء المخزن INSER_UPDAT_DELETTAB_5INT_2DAT_1NVA
        request.input('sch1', sql.Int, EzenStudID || 0);
        request.input('sch2', sql.Int, StudentID || 0);
        request.input('sch3', sql.Date, EzenStudDate || null);
        
        // التعامل مع الوقت: نرسله كـ String (NVarchar) لتجنب مشاكل الفورمات، والـ SQL هيحوله تلقائياً لـ TIME
        request.input('sch4', sql.NVarChar(50), EzenStudTime || null);
        
        request.input('sch5', sql.NVarChar(250), EzenStudSabb || '');
        request.input('sch6', sql.Int, EzenStudNo || 0);
        request.input('sch7', sql.Int, YerID || 0);
        request.input('INPOT', sql.Int, INPOT);

        // تنفيذ الإجراء
        await request.execute('INSER_UPDAT_DELETTAB_5INT_2DAT_1NVA');

        res.json({ success: true, message: 'تمت العملية بنجاح' });

    } catch (err) {
        console.error('SQL Error (Exit Permit):', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API تحديد مصروفات الصف (مبالغ فقط)
// ==========================================================
app.post('/api/fees/grade-setup', async (req, res) => {
    const {
        FeeID,
        GradeID,
        YerID,
        TotalAmount,
        InstallmentCount,
        Installments, // Array of numbers: [100, 200, 50...]
        INPOT
    } = req.body;

    if (!GradeID || !YerID || !INPOT) {
        return res.status(400).json({ success: false, error: 'بيانات ناقصة' });
    }

    try {
        const request = new sql.Request();
        
        // تجهيز المبالغ من الـ Array
        const inst1 = Installments?.[0] || 0;
        const inst2 = Installments?.[1] || 0;
        const inst3 = Installments?.[2] || 0;
        const inst4 = Installments?.[3] || 0;

        request.input('sch1', sql.Int, FeeID || 0);
        request.input('sch2', sql.Int, GradeID);
        request.input('sch3', sql.Int, YerID);
        request.input('sch4', sql.Decimal(18,2), TotalAmount || 0);
        request.input('sch5', sql.Int, InstallmentCount || 1);
        request.input('sch6', sql.Decimal(18,2), inst1);
        request.input('sch7', sql.Decimal(18,2), inst2);
        request.input('sch8', sql.Decimal(18,2), inst3);
        request.input('sch9', sql.Decimal(18,2), inst4);
        request.input('INPOT', sql.Int, INPOT);

        await request.execute('INSER_UPDAT_DELETTAB_GradeFees');

        res.json({ success: true, message: 'تم حفظ بيانات المصروفات' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API سداد المصروفات (إضافة / تعديل / حذف)
// ==========================================================
app.post('/api/fees/payment', async (req, res) => {
    const {
        MsrofatNID,       // sch1
        StudentID,        // sch2
        SchoolID,         // sch3
        YerID,            // sch4
        GradeID,          // sch13 (جديد)
        MsrofatNasDate,   // sch5
        PaymentType,      // sch6
        InstallmentNumber,// sch7 (رقم القسط)
        kasemaNam,        // sch8
        PaidAmount,       // sch10
        ImageBase64,      // sch12 (صورة بصيغة Base64)
        INPOT             // 1=إضافة, 2=تعديل, 3=حذف
    } = req.body;

    // التحقق من البيانات الأساسية
    if (!StudentID || !SchoolID || !YerID || !INPOT) {
        return res.status(400).json({ success: false, error: 'البيانات الأساسية ناقصة' });
    }

    try {
        const request = new sql.Request();

        // تحويل الصورة من Base64 إلى Buffer (لو موجودة)
        let imgBuffer = null;
        if (ImageBase64 && ImageBase64.length > 20) {
            let base64Data = ImageBase64;
            if (base64Data.includes(',')) base64Data = base64Data.split(',')[1];
            imgBuffer = Buffer.from(base64Data, 'base64');
        }

        // ربط المتغيرات
        request.input('sch1', sql.Int, MsrofatNID || 0);
        request.input('sch2', sql.Int, StudentID);
        request.input('sch3', sql.Int, SchoolID);
        request.input('sch4', sql.Int, YerID);
        request.input('sch13', sql.Int, GradeID || 0); //GradeID
        request.input('sch5', sql.Date, MsrofatNasDate || null);
        request.input('sch6', sql.NVarChar(50), PaymentType || '');
        request.input('sch7', sql.Int, InstallmentNumber || 1); // INT
        request.input('sch8', sql.NVarChar(50), kasemaNam || '');
        request.input('sch10', sql.Decimal(10,2), PaidAmount || 0);
        
        // ✨ التعديل هنا: استبدال sql.Image بـ sql.VarBinary(sql.MAX)
        request.input('sch12', sql.VarBinary(sql.MAX), imgBuffer); 
        
        request.input('INPOT', sql.Int, INPOT);

        // الـ Output Parameter
        request.output('sch11', sql.Decimal(10,2));

        // تنفيذ الإجراء
        const result = await request.execute('msrwfeatnase1');

        // الـ Recordset فيه المتبقي
        const remaining = result.recordset && result.recordset[0] ? result.recordset[0].RemainingAmount : 0;

        res.json({ 
            success: true, 
            message: 'تمت العملية بنجاح',
            remainingAmount: remaining
        });

    } catch (err) {
        console.error('SQL Error (Fees Payment):', err);
        // لو الـ SQL رجع خطأ محدد (زي "لا توجد مصروفات")
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/fees/gov-payment', async (req, res) => {
    const {
        MsrofatID,      
        masrofatgate,   
        msrofatTyp,     
        msrwfatCont,    
        NamperSdad,     
        StudentID,      
        YerID,          
        ImageBase64,    
        INPOT           
    } = req.body;

    if (!StudentID || !YerID || !INPOT) {
        return res.status(400).json({ success: false, error: 'بيانات ناقصة' });
    }

    try {
        const request = new sql.Request();

        // تحويل الصورة
        let imgBuffer = null;
        if (ImageBase64 && ImageBase64.length > 20) {
            let base64Data = ImageBase64;
            if (base64Data.includes(',')) base64Data = base64Data.split(',')[1];
            imgBuffer = Buffer.from(base64Data, 'base64');
        }

        // ربط المتغيرات
        request.input('sch1', sql.Int, MsrofatID || 0);
        request.input('sch2', sql.Date, masrofatgate || null); // sql.Date مظبوط مع DATE في الـ DB
        request.input('sch3', sql.NVarChar(50), msrofatTyp || '');
        request.input('sch4', sql.NVarChar(50), msrwfatCont || '');
        request.input('sch5', sql.Int, NamperSdad || 0);
        request.input('sch6', sql.Int, StudentID);
        request.input('sch7', sql.Int, YerID);
        
        // ✨ التعديل الوحيد المطلوب (استبدال sql.Image بـ sql.VarBinary)
        request.input('sch8', sql.VarBinary(sql.MAX), imgBuffer); 
        
        request.input('INPOT', sql.Int, INPOT);

        await request.execute('INSER_UPDAT_DELETTAB_5INT_1DAT_3NVA');

        res.json({ success: true, message: 'تمت العملية بنجاح' });

    } catch (err) {
        console.error('SQL Error (Gov Payment):', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API حفظ أرقام الجلوس والسرية (AddOrUpdateExamSeat)
// ==========================================================
app.post('/api/exam/seats', async (req, res) => {
    const { StudentID, seat_number, secret_number, SchoolID } = req.body;

    // التحقق من البيانات الأساسية
    if (!StudentID || !SchoolID) {
        return res.status(400).json({ 
            success: false, 
            error: 'البيانات ناقصة (StudentID و SchoolID مطلوبان)' 
        });
    }

    try {
        const request = new sql.Request();

        // ربط المتغيرات مع الإجراء المخزن AddOrUpdateExamSeat
        request.input('StudentID', sql.Int, StudentID);
        request.input('seat_number', sql.Int, seat_number || 0);     // رقم الجلوس
        request.input('secret_number', sql.Int, secret_number || 0); // الرقم السري
        request.input('SchoolID', sql.Int, SchoolID);

        // تنفيذ الإجراء
        await request.execute('AddOrUpdateExamSeat');

        res.json({ success: true, message: 'تم حفظ أرقام الجلوس بنجاح' });

    } catch (err) {
        console.error('خطأ في حفظ أرقام الجلوس:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API حفظ توزيع اللجان (INSER_UPDAT_DELETTAB_8int)
// ==========================================================
app.post('/api/committees/distribution', async (req, res) => {
    const { 
        SchoolID,       // sch1
        MrahelID,       // sch2
        GereadID,       // sch3
        committee_name, // sch4
        StartSeatNumber,// sch5
        EndSeatNumber,  // sch6
        StudentsCount   // sch7
    } = req.body;

    // التحقق من البيانات الأساسية
    if (!SchoolID || !MrahelID || !GereadID) {
        return res.status(400).json({ success: false, error: 'البيانات الأساسية ناقصة' });
    }

    try {
        const request = new sql.Request();
        
        request.input('sch1', sql.Int, SchoolID);
        request.input('sch2', sql.Int, MrahelID);
        request.input('sch3', sql.Int, GereadID);
        request.input('sch4', sql.NVarChar(100), committee_name);
        request.input('sch5', sql.Int, StartSeatNumber);
        request.input('sch6', sql.Int, EndSeatNumber);
        request.input('sch7', sql.Int, StudentsCount);
        request.input('INPOT', sql.Int, 1); // 1 = إضافة توزيع

        await request.execute('INSER_UPDAT_DELETTAB_8int');

        res.json({ success: true, message: 'تم حفظ التوزيع بنجاح' });

    } catch (err) {
        console.error('خطأ في حفظ التوزيع:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================
// 🔹 API حفظ إعدادات المادة والأجزاء (SaveSubjectAndParts)
// ==========================================================
app.post('/api/subjects/save-setup', async (req, res) => {
    const { 
        SabgektID, GereadID, 
        EvaluationCount, EvaluationTotalMax, 
        HasExam, ExamMax, 
        IsEvaluationOnly, IsExamOnly, 
        Parts, // Array of { PartNumber, PartName, PartGrade }
        Operation 
    } = req.body;

    // التحقق من الأساسيات
    if (!SabgektID || !GereadID) {
        return res.status(400).json({ success: false, error: 'بيانات ناقصة' });
    }

    try {
        const request = new sql.Request();

        // 1. بناء جدول الـ TVP (EvaluationPartsType)
        const tvp = new sql.Table();
        // الأعمدة يجب أن تطابق تعريف الـ Type في SQL بالترتيب والنوع
        tvp.columns.add('PartNumber', sql.Int);
        tvp.columns.add('PartName', sql.NVarChar(100));
        tvp.columns.add('PartGrade', sql.Decimal(5, 2));

        // تعبئة الجدول بالبيانات
        if (Parts && Parts.length > 0) {
            Parts.forEach(p => {
                // ملاحظة: الترتيب مهم جداً هنا
                tvp.rows.add(
                    p.PartNumber, 
                    p.PartName, 
                    p.PartGrade || 0
                );
            });
        }

        // 2. إضافة المدخلات العادية
        request.input('SabgektID', sql.Int, SabgektID);
        request.input('GereadID', sql.Int, GereadID);
        request.input('EvaluationCount', sql.Int, EvaluationCount || 0);
        request.input('EvaluationTotalMax', sql.Decimal(5,2), EvaluationTotalMax || 0);
        request.input('HasExam', sql.Bit, HasExam ? 1 : 0);
        request.input('ExamMax', sql.Decimal(5,2), ExamMax || 0);
        request.input('IsEvaluationOnly', sql.Bit, IsEvaluationOnly ? 1 : 0);
        request.input('IsExamOnly', sql.Bit, IsExamOnly ? 1 : 0);
        request.input('Operation', sql.Int, Operation || 1);

        // 3. إضافة الـ TVP كـ Parameter
        request.input('Parts', tvp);

        // 4. تنفيذ الإجراء
        await request.execute('SaveSubjectAndParts');

        res.json({ success: true, message: 'تم حفظ البيانات بنجاح' });

    } catch (err) {
        console.error('SQL Error in SaveSubjectAndParts:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API حفظ جدول الاختبارات (INSER_UPDAT_DELETTAB_6INT_3DAT_2NVA)
// ==========================================================
app.post('/api/exams/schedule', async (req, res) => {
    const {
        GadwelExID,     // sch1 (int)
        exaem_dat,      // sch2 (date)
        exaem_moafek,   // sch3 (nvarchar) -> اسم اليوم
        GereadID,       // sch4 (int)
        SabgektID,      // sch5 (int)
        SchoolID,       // sch6 (int)
        YerID,          // sch7 (int)
        TiremID,        // sch8 (int)
        exam_men,       // sch9 (time)
        exam_ela,       // sch10 (time)
        sxzam_moda,     // sch11 (nvarchar) -> زمن الاختبار
        exam_ftra,      // sch12 (nvarchar) -> الفترة
        INPOT           // 1=اضافة, 2=تعديل, 3=حذف
    } = req.body;

    try {
        const request = new sql.Request();

        // ربط المتغيرات بالترتيب والأنواع المطلوبة
        request.input('sch1', sql.Int, GadwelExID || 0);
        request.input('sch2', sql.Date, exaem_dat || null);
        request.input('sch3', sql.NVarChar(50), exaem_moafek || '');
        request.input('sch4', sql.Int, GereadID || 0);
        request.input('sch5', sql.Int, SabgektID || 0);
        request.input('sch6', sql.Int, SchoolID || 0);
        request.input('sch7', sql.Int, YerID || 0);
        request.input('sch8', sql.Int, TiremID || 0);
        request.input('sch9', sql.NVarChar(50), exam_men || null); // Time as string
        request.input('sch10', sql.NVarChar(50), exam_ela || null);
        request.input('sch11', sql.NVarChar(50), sxzam_moda || '');
        request.input('sch12', sql.NVarChar(50), exam_ftra || '');
        request.input('INPOT', sql.Int, INPOT);

        await request.execute('INSER_UPDAT_DELETTAB_6INT_3DAT_2NVA');

        res.json({ success: true, message: 'تمت العملية بنجاح' });

    } catch (err) {
        console.error('خطأ في حفظ جدول الاختبارات:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API جلب اللجان النشطة لتوزيع الملاحظين
// ==========================================================
app.get('/api/committees/active', async (req, res) => {
    const { schoolId, gradeId } = req.query;
    if (!schoolId) return res.status(400).json({ success: false, error: 'SchoolID required' });

    try {
        const request = new sql.Request();
        request.input('SchoolID', sql.Int, schoolId);
        // لو فيه gradeId هنفلتر بيه، لو لا نجيب الكل
        let query = `
            SELECT id, committee_name 
            FROM CommitteesDistribution 
            WHERE SchoolID = @SchoolID AND StudentsCount > 0
        `;
        if (gradeId) {
            request.input('GradeID', sql.Int, gradeId);
            query += ` AND GereadID = @GradeID`;
        }

        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================
// 🔹 API حفظ توزيع الملاحظين (ExamDistribution12)
// ==========================================================
app.post('/api/exam/distribution', async (req, res) => {
    const { 
        ExamDate, ExamPeriod, SubjectName, CommitteeName, 
        Teacher1, Teacher2, SchoolID, YearID, TiremID, INPOT 
    } = req.body;

    try {
        const request = new sql.Request();
        
        // تمرير الباراميترات بالاسم الموجود في الـ Procedure
        request.input('ExamDate', sql.Date, ExamDate || null);
        request.input('ExamPeriod', sql.NVarChar(50), ExamPeriod || '');
        request.input('SubjectName', sql.NVarChar(100), SubjectName || '');
        request.input('CommitteeName', sql.NVarChar(100), CommitteeName || '');
        request.input('Teacher1', sql.NVarChar(100), Teacher1 || '');
        request.input('Teacher2', sql.NVarChar(100), Teacher2 || '');
        request.input('SchoolID', sql.Int, SchoolID);
        request.input('YerID', sql.Int, YearID);
        request.input('TiremID', sql.Int, TiremID);
        request.input('INPOT', sql.Int, INPOT || 1);

        // تنفيذ الإجراء
        await request.execute('ExamDistribution12');
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API عرض درجات التقييم (GetStudentExamParts)
// ==========================================================
app.post('/api/grades/evaluation/view', async (req, res) => {
    const { SchoolID, MrahelID, YerID, GereadID, TiremID, MonesID, SabgektID, INPOT } = req.body;

    try {
        const request = new sql.Request();
        request.input('SchoolID', sql.Int, SchoolID);
        request.input('MrahelID', sql.Int, MrahelID);
        request.input('YerID', sql.Int, YerID);
        request.input('GereadID', sql.Int, GereadID);
        request.input('TiremID', sql.Int, TiremID);
        request.input('MonesID', sql.Int, MonesID || null);
        request.input('SabgektID', sql.Int, SabgektID); // ده هنا هو SubjectGradeID
        request.input('INPOT', sql.Int, INPOT);

        const result = await request.execute('GetStudentExamParts');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================
// 🔹 API حفظ درجة جزء واحد (SaveStudentGrades)
// ==========================================================
app.post('/api/grades/evaluation/save', async (req, res) => {
    const { StudentID, SubjectGradeID, TermID, YearID, MonthID, PartNumber, PartName, PartGrade } = req.body;

    try {
        const request = new sql.Request();
        request.input('StudentID', sql.Int, StudentID);
        request.input('SubjectGradeID', sql.Int, SubjectGradeID);
        request.input('TermID', sql.Int, TermID);
        request.input('YearID', sql.Int, YearID);
        request.input('MonthID', sql.Int, MonthID);
        request.input('PartNumber', sql.Int, PartNumber || 0); // يمكن عدم الحاجة له
        request.input('PartName', sql.NVarChar(100), PartName);
        request.input('PartGrade', sql.Decimal(5, 2), PartGrade);

        await request.execute('SaveStudentGrades');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API حفظ درجات الاختبار (SaveReExamGrades)
// ==========================================================
app.post('/api/grades/exam/save', async (req, res) => {
    const { StudentID, SubjectGradeID, YearID, TiremID, ExamGrade } = req.body;

    try {
        const request = new sql.Request();
        request.input('StudentID', sql.Int, StudentID);
        request.input('SubjectGradeID', sql.Int, SubjectGradeID);
        request.input('YearID', sql.Int, YearID);
        request.input('TiremID', sql.Int, TiremID);
        request.input('ExamGrade', sql.NVarChar(10), String(ExamGrade)); // nvarchar as per SP

        await request.execute('SaveReExamGrades');
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// المسار: /api/grades/save-exam-grade
app.post('/api/grades/save-exam-grade', async (req, res) => {
    // استلام البيانات من الفرونت إند
    const { 
        StudentID, 
        SubjectGradeID, 
        ExamGrade, 
        YearID, 
        TermID, 
        MonthID, 
        Mode 
    } = req.body;

    // التحقق من وجود البيانات الأساسية
    if (!StudentID || !SubjectGradeID || !YearID || !TermID || !MonthID || !Mode) {
        return res.status(400).json({ 
            success: false, 
            error: 'جميع الحقول مطلوبة (StudentID, SubjectGradeID, YearID, TermID, MonthID, Mode)' 
        });
    }

    try {
        const request = new sql.Request();
        
        // تعريف المدخلات للإجراء المخزن
        request.input('StudentID', sql.Int, StudentID);
        request.input('SubjectGradeID', sql.Int, SubjectGradeID);
        // ExamGrade يمكن أن يكون نص ("غ") أو رقم، لذا نرسله كـ NVARCHAR
        request.input('ExamGrade', sql.NVarChar(10), ExamGrade || ''); 
        request.input('YearID', sql.Int, YearID);
        request.input('TermID', sql.Int, TermID);
        request.input('MonthID', sql.Int, MonthID);
        request.input('Mode', sql.Int, Mode);

        // تنفيذ الإجراء المخزن
        await request.execute('SaveStudentExamGrade');

        // إرجاع رسالة النجاح
        res.json({ 
            success: true, 
            message: Mode === 2 ? 'تم حذف الدرجة بنجاح' : 'تم حفظ الدرجة بنجاح' 
        });

    } catch (err) {
        console.error("SQL Error:", err);
        
        // في حالة وجود خطأ من الـ SQL (مثل RAISERROR)
        // نقوم بإرسال رسالة الخطأ للفرونت إند
        res.status(500).json({ 
            success: false, 
            error: err.originalError?.message || err.message 
        });
    }
});
// ==========================================================
// 🔹 API جلب أقصى درجات الأجزاء (للـ Tags)
// ==========================================================
app.get('/api/subjects/parts-max/:subjectGradeId', async (req, res) => {
    const { subjectGradeId } = req.params;
    try {
        const request = new sql.Request();
        request.input('SubjectGradeID', sql.Int, subjectGradeId);
        // الاستعلام ده شبه اللي في دالة GetPartMax بالظبط
        const query = `
            SELECT PartName, PartGrade 
            FROM SubjectGradeEvaluationParts 
            WHERE SubjectGradeID = @SubjectGradeID
        `;
        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.post('/api/reports/exam-sheet', async (req, res) => {
    const { SchoolID, MrahelID, YearID, GradeID, TermID, MonthID, OrderList, INPOT } = req.body;

    // طباعة القيم الواصلة في الكونسول
    console.log("Received Data:", req.body);

    try {
        const request = new sql.Request();
        request.input('SchoolID', sql.Int, SchoolID);
        request.input('MrahelID', sql.Int, MrahelID);
        request.input('YearID', sql.Int, YearID);
        request.input('GradeID', sql.Int, GradeID);
        request.input('TermID', sql.Int, TermID);
        request.input('MonthID', sql.Int, MonthID);
        request.input('OrderList', sql.NVarChar(sql.MAX), OrderList || ''); 
        request.input('INPOT', sql.Int, INPOT);

        const result = await request.execute('GetStudentExamParts25');
        
        // حتى لو النتيجة فاضية، رجع success=true
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error(err);
        // هنا هنبعت ال Error Message للفرونت اند
        res.status(500).json({ success: false, error: err.message });
    }
});
// المسار: /api/reports/exam-summary
app.post('/api/reports/exam-summary', async (req, res) => {
    // استلام البيانات من الفرونت إند
    const { 
        SchoolID, 
        MrahelID, 
        YearID, 
        GradeID, 
        INPOT, 
        OrderList, 
        MainSubjects 
    } = req.body;

    // التحقق من البيانات الأساسية
    if (!SchoolID || !MrahelID || !YearID || !GradeID) {
        return res.status(400).json({ 
            success: false, 
            error: 'الرجاء إرسال جميع المعرفات الأساسية (SchoolID, MrahelID, YearID, GradeID)' 
        });
    }

    try {
        const request = new sql.Request();

        // تعريف المدخلات
        request.input('SchoolID', sql.Int, SchoolID);
        request.input('MrahelID', sql.Int, MrahelID);
        request.input('YearID', sql.Int, YearID);
        request.input('GradeID', sql.Int, GradeID);
        // INPOT له قيمة افتراضية 1 في الـ SP، لكن نرسله إذا وجد
        request.input('INPOT', sql.Int, INPOT || 1); 
        // القوائم النصية (قد تكون null)
        request.input('OrderList', sql.NVarChar(sql.MAX), OrderList || null);
        request.input('MainSubjects', sql.NVarChar(sql.MAX), MainSubjects || null);

        // تنفيذ الإجراء المخزن
        const result = await request.execute('GetStudentExamParts25_v2');

        // إرسال النتيجة
        // ملاحظة: الإجراء يعيد أعمدة ديناميكية، لذا سنرسل البيانات كما هي
        res.json({ 
            success: true, 
            data: result.recordset 
        });

    } catch (err) {
        console.error("SQL Error in GetStudentExamParts25_v2:", err);
        
        // معالجة أخطاء الـ RAISERROR القادمة من الـ SQL
        res.status(500).json({ 
            success: false, 
            error: err.originalError?.message || err.message 
        });
    }
});
// API: حفظ واسترجاع إعدادات المواد (ترتيب - مواد أساسية)
app.post('/api/settings/subjects-settings', async (req, res) => {
    const { 
        Mode,       // 1 = مواد أساسية, 2 = ترتيب مواد
        Action,     // 'SAVE' أو 'GET'
        SchoolID, 
        MrahelID, 
        YearID, 
        GradeID, 
        TirmID, 
        MonesID, 
        Subjects,   // قائمة المواد الأساسية (مفصولة بفاصلة)
        OrderList   // قائمة الترتيب (مفصولة بفاصلة)
    } = req.body;

    // التحقق من المدخلات الأساسية
    if (!Mode || !Action || !SchoolID || !GradeID) {
        return res.status(400).json({ success: false, message: 'بيانات ناقصة' });
    }

    try {
        const request = new sql.Request();
        
        // تعريف المدخلات
        request.input('Mode', sql.Int, Mode);
        request.input('Action', sql.NVarChar(10), Action);
        request.input('SchoolID', sql.Int, SchoolID);
        request.input('MrahelID', sql.Int, MrahelID || 0);
        request.input('YearID', sql.Int, YearID || 0);
        request.input('GradeID', sql.Int, GradeID);
        request.input('TirmID', sql.Int, TirmID || 0);
        request.input('MonesID', sql.Int, MonesID || 0);
        
        // المدخلات الاختيارية (للحفظ)
        if (Subjects) request.input('Subjects', sql.NVarChar(sql.MAX), Subjects);
        if (OrderList) request.input('OrderList', sql.NVarChar(sql.MAX), OrderList);

        // تنفيذ الاجراء
        const result = await request.execute('SaveSubjectsSettings');

        // في حالة الاسترجاع (GET)
        if (Action === 'GET') {
            res.json({ success: true, data: result.recordset });
        } else {
            // في حالة الحفظ (SAVE)
            res.json({ success: true, message: 'تم الحفظ بنجاح' });
        }

    } catch (err) {
        console.error("SQL Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API شهادات الطلاب (GetStudentExamParts30)
// ==========================================================
app.post('/api/reports/certificates', async (req, res) => {
    const { SchoolID, MrahelID, YearID, GradeID, TermID, MonthID, OrderList, INPOT } = req.body;

    // التحقق من الأساسيات
    if (!SchoolID || !GradeID || !INPOT) {
        return res.status(400).json({ success: false, error: 'البيانات الأساسية ناقصة' });
    }

    try {
        const request = new sql.Request();
        request.input('SchoolID', sql.Int, SchoolID);
        request.input('MrahelID', sql.Int, MrahelID || 0);
        request.input('YearID', sql.Int, YearID);
        request.input('GradeID', sql.Int, GradeID);
        request.input('TermID', sql.Int, TermID || 0);
        request.input('MonthID', sql.Int, MonthID || null);
        request.input('OrderList', sql.NVarChar(sql.MAX), OrderList || null);
        request.input('INPOT', sql.Int, INPOT); 

        const result = await request.execute('GetStudentExamParts30');

        // === التعديل هنا: التحقق من نوع التقرير لإرجاع الجداول المناسبة ===
        if (INPOT === 3) {
            // في حالة الإحصاء العام، الـ SP بترجع 3 جداول
            // نرجعهم كـ data, data2, data3
            res.json({ 
                success: true, 
                data: result.recordsets[0] || [], 
                data2: result.recordsets[1] || [], 
                data3: result.recordsets[2] || [] 
            });
        } else {
            // في باقي الحالات (1, 2, 4, 5) يرجع جدول واحد فقط
            res.json({ success: true, data: result.recordset });
        }

    } catch (err) {
        console.error('SQL Error (Certificates):', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API جلب قائمة الطلاب (للقائمة المنسدلة)
// ==========================================================
app.get('/api/students/list', async (req, res) => {
    const { schoolId, gradeId, yearId } = req.query;
    if (!schoolId || !gradeId) return res.status(400).json({ success: false, error: 'ناقص' });

    try {
        const request = new sql.Request();
        // جلب الطلاب مرتبين أبجدياً
        const query = `
            SELECT StudentID, ArbStudName 
            FROM STUDENT 
            WHERE SchoolID = ${schoolId} AND GereadID = ${gradeId} AND YerID = ${yearId || 0}
            ORDER BY ArbStudName
        `;
        const result = await request.query(query);
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API جلب ترتيب الطلاب (GetStudentExamRanks)
// ==========================================================
app.post('/api/reports/rankings', async (req, res) => {
    const { SchoolID, MrahelID, YerID, GereadID, TiremID, MonesID, StudentID } = req.body;

    // التحقق من البيانات الأساسية
    if (!SchoolID || !GereadID || !YerID) {
        return res.status(400).json({ success: false, error: 'البيانات الأساسية ناقصة' });
    }

    try {
        // 1. جلب العشرة الأوائل (INPOT = 1)
        const request1 = new sql.Request();
        request1.input('SchoolID', sql.Int, SchoolID);
        request1.input('MrahelID', sql.Int, MrahelID || 0);
        request1.input('YerID', sql.Int, YerID);
        request1.input('GereadID', sql.Int, GereadID);
        request1.input('TiremID', sql.Int, TiremID || 0);
        request1.input('MonesID', sql.Int, MonesID || 0);
        request1.input('INPOT', sql.Int, 1); // وضع الأوائل على مستوى الصف
        request1.input('TopN', sql.Int, 10); // نجلب أعلى 10
        
        const resultTop = await request1.execute('GetStudentExamRanks');
        const top10 = resultTop.recordset;

        // 2. جلب ترتيب الطالب المحدد (INPOT = 3) - لو تم إرسال ID الطالب
        let studentRank = null;
        if (StudentID) {
            const request2 = new sql.Request();
            request2.input('SchoolID', sql.Int, SchoolID);
            request2.input('MrahelID', sql.Int, MrahelID || 0);
            request2.input('YerID', sql.Int, YerID);
            request2.input('GereadID', sql.Int, GereadID);
            request2.input('TiremID', sql.Int, TiremID || 0);
            request2.input('MonesID', sql.Int, MonesID || 0);
            request2.input('INPOT', sql.Int, 3); // وضع ترتيب طالب محدد
            request2.input('StudentID', sql.Int, StudentID);
            
            const resultStudent = await request2.execute('GetStudentExamRanks');
            if (resultStudent.recordset.length > 0) {
                studentRank = resultStudent.recordset[0];
            }
        }

        res.json({
            success: true,
            top10: top10,
            studentRank: studentRank
        });

    } catch (err) {
        console.error('SQL Error (Rankings):', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API تكويد الأصناف (INSER_UPDAT_DELETTAB_3in2nv1dec)
// ==========================================================
app.post('/api/items/save', async (req, res) => {
    // استقبال البيانات من الفرونت
    const { id, magzaenId, schoolId, unit, name, balance, operation } = req.body;
    // operation: 1=إضافة, 2=تعديل, 3=حذف

    try {
        const request = new sql.Request();

        // ربط المتغيرات مع مدخلات الإجراء المخزن
        request.input('sch1', sql.Int, id);                 // SANEFID
        request.input('sch2', sql.Int, magzaenId);          // MagzaenID
        request.input('sch3', sql.Int, schoolId);           // SchoolID
        request.input('sch4', sql.NVarChar(50), unit);      // SANEFWEHDA (الوحدة)
        request.input('sch5', sql.NVarChar(250), name);     // SANEFNAM (اسم الصنف)
        request.input('sch6', sql.Decimal(18, 0), balance); // SANEFRASED (الرصيد)
        request.input('INPOT', sql.Int, operation);         // 1, 2, 3

        // تنفيذ الإجراء المخزن
        await request.execute('INSER_UPDAT_DELETTAB_3in2nv1dec');
        
        res.json({ success: true });
    } catch (err) {
        console.log('خطأ في حفظ الصنف:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================
// 🔹 API حذف إذن الإضافة (PurchaseOrders_Manage - INPOT 5)
// ==========================================================
app.post('/api/purchase-orders/delete', async (req, res) => {
    const { orderId } = req.body;
    try {
        const request = new sql.Request();
        request.input('PurchaseOrderID', sql.Int, orderId);
        request.input('INPOT', sql.Int, 5); // كود الحذف الكامل
        // باقي المدخلات null
        request.input('PurchaseDate', sql.DateTime, null);
        request.input('SupplierName', sql.NVarChar, null);
        request.input('SchoolID', sql.Int, null);
        request.input('fatwra_naber', sql.Int, null);
        request.input('fatwera_date', sql.DateTime, null);
        request.input('SANEFID', sql.Int, null);
        request.input('MagzaenID', sql.Int, null);
        request.input('Quantity', sql.Decimal, null);
        request.input('UnitPrice', sql.Decimal, null);

        await request.execute('PurchaseOrders_Manage');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================
// 🔹 API حذف إذن الصرف (IssuanceOrders_Manage - INPOT 6)
// ==========================================================
app.post('/api/issuance-orders/delete', async (req, res) => {
    const { orderId } = req.body;
    try {
        const request = new sql.Request();
        request.input('IssuanceOrderID', sql.Int, orderId);
        request.input('INPOT', sql.Int, 6); // كود الحذف الكامل
        // باقي المدخلات null
        request.input('EmploeID', sql.Int, null);
        request.input('IssuanceDate', sql.DateTime, null);
        request.input('SchoolID', sql.Int, null);
        request.input('n_ahdea', sql.NVarChar, null);
        request.input('StudentID', sql.Int, null);
        request.input('SANEFID', sql.Int, null);
        request.input('MagzenID', sql.Int, null);
        request.input('Quantity', sql.Decimal, null);
        request.input('wehda_keas', sql.NVarChar, null);

        await request.execute('IssuanceOrders_Manage');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API جلب التوزيع القديم للإذن
// ==========================================================
app.get('/api/issuance-orders/distributions', async (req, res) => {
    const { orderId, sanefId } = req.query;

    try {
        const request = new sql.Request();
        request.input('IssuanceOrderID', sql.Int, orderId);
        request.input('SanefID', sql.Int, sanefId);

        // جلب الطلاب اللي اتصرف ليهم في الإذن ده للصنف ده
        const result = await request.query`
            SELECT StudentID, Quantity 
            FROM TozeStudSanf 
            WHERE IssuanceOrderID = @IssuanceOrderID AND SanefID = @SanefID
        `;
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API إدارة أذونات الإضافة (إنشاء فاتورة - إضافة صنف - تعديل - حذف)
// ==========================================================
app.post('/api/purchase-orders/manage', async (req, res) => {
    const { 
        purchaseOrderId, purchaseDate, supplierName, schoolId, 
        invoiceNum, invoiceDate, // الهيدر
        sanefId, magzaenId, quantity, unitPrice, // التفاصيل
        inpout // 1=إنشاء فاتورة, 2=إضافة صنف, 3=تعديل صنف, 4=حذف صنف, 5=حذف فاتورة
    } = req.body;

    try {
        const request = new sql.Request();

        // تجهيز المدخلات للإجراء المخزن PurchaseOrders_Manage
        request.input('PurchaseOrderID', sql.Int, purchaseOrderId || null);
        request.input('PurchaseDate', sql.DateTime, purchaseDate ? new Date(purchaseDate) : null);
        request.input('SupplierName', sql.NVarChar(100), supplierName || '');
        request.input('SchoolID', sql.Int, schoolId);
        request.input('fatwra_naber', sql.Int, invoiceNum || null);       // رقم الفاتورة
        request.input('fatwera_date', sql.DateTime, invoiceDate ? new Date(invoiceDate) : null); // تاريخ الفاتورة
        
        // مدخلات الأصناف (للتفاصيل)
        request.input('SANEFID', sql.Int, sanefId || null);
        request.input('MagzaenID', sql.Int, magzaenId || null);
        request.input('Quantity', sql.Decimal(10, 2), quantity || 0);
        request.input('UnitPrice', sql.Decimal(10, 2), unitPrice || 0);

        request.input('INPOT', sql.Int, inpout);

        await request.execute('PurchaseOrders_Manage');
        res.json({ success: true, message: 'تمت العملية بنجاح' });

    } catch (err) {
        console.error('خطأ في إذن الإضافة:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================
// 🔹 API إدارة أذونات الصرف (إنشاء إذن - صرف - توزيع)
// ==========================================================
app.post('/api/issuance-orders/manage', async (req, res) => {
    const { 
        orderId, date, schoolId, employeeId, sideName, // الهيدر
        sanefId, storeId, qty, unit, // التفاصيل
        studentId, // التوزيع
        inpout // 1=إنشاء إذن, 2=إضافة صنف, 3=تعديل, 5=توزيع طالب, 6=حذف إذن
    } = req.body;

    try {
        const request = new sql.Request();

        // تجهيز المدخلات للإجراء المخزن IssuanceOrders_Manage
        request.input('IssuanceOrderID', sql.Int, orderId || null);
        request.input('IssuanceDate', sql.DateTime, date ? new Date(date) : null);
        request.input('SchoolID', sql.Int, schoolId);
        request.input('EmploeID', sql.Int, employeeId || null);
        request.input('n_ahdea', sql.NVarChar(100), sideName || ''); // جهة الصرف
        
        // تفاصيل الصنف
        request.input('SANEFID', sql.Int, sanefId || null);
        request.input('MagzenID', sql.Int, storeId || null);
        request.input('Quantity', sql.Decimal(10, 2), qty || 0);
        request.input('wehda_keas', sql.NVarChar(50), unit || ''); // الوحدة
        
        // للتوزيع
        request.input('StudentID', sql.Int, studentId || null);

        request.input('INPOT', sql.Int, inpout);

        await request.execute('IssuanceOrders_Manage');
        res.json({ success: true, message: 'تمت العملية بنجاح' });

    } catch (err) {
        console.error('خطأ في إذن الصرف:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API تحديث جرد الأصناف (Update_StockActual)
// ==========================================================
app.post('/api/inventory/update-actual', async (req, res) => {
    const { sanefId, actualQty, itemStatus } = req.body;

    if (!sanefId) {
        return res.status(400).json({ success: false, error: 'رقم الصنف مطلوب' });
    }

    try {
        const request = new sql.Request();
        request.input('SANEFID', sql.Int, sanefId);
        request.input('ActualQty', sql.Decimal(18, 0), actualQty || 0);
        request.input('ItemStatus', sql.NVarChar(50), itemStatus || 'جديد');

        await request.execute('Update_StockActual');
        
        res.json({ success: true, message: 'تم تحديث الجرد بنجاح' });
    } catch (err) {
        console.error('خطأ في تحديث الجرد:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API إضافة / تعديل / حذف الكورسات
// يستخدم الإجراء المخزن: INSER_UPDAT_DELETTAB_4int_2nvv_1DC
// ==========================================================
app.post('/api/courses', async (req, res) => {
    const { courseId, schoolId, subjectId, employeeId, courseName, price, sessions, processType } = req.body;

    try {
        const request = new sql.Request();
        request.input('sch1', sql.Int, courseId);              // CourseID
        request.input('sch2', sql.Int, schoolId);              // SchoolID
        request.input('sch3', sql.Int, subjectId);             // SubjectID
        request.input('sch4', sql.Int, employeeId);            // EmploeID
        request.input('sch5', sql.NVarChar(100), courseName);  // CourseName
        request.input('sch6', sql.Decimal(10, 2), price);      // Price
        request.input('sch7', sql.Int, sessions);              // SessionsPerPackage
        request.input('INPOT', sql.Int, processType);          // نوع العملية (1, 2, 3)

        await request.execute('INSER_UPDAT_DELETTAB_4int_2nvv_1DC');

        res.json({ success: true, message: 'تمت العملية بنجاح' });
    } catch (err) {
        console.error('خطأ في حفظ الكورس:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API إضافة / تعديل / حذف مواعيد الكورسات
// يستخدم الإجراء المخزن: INSER_UPDAT_DELETTAB_3int_1nvv_2tim
// ==========================================================
app.post('/api/courseSchedule', async (req, res) => {
    const { sch1, sch2, sch3, sch4, sch5, sch6, INPOT } = req.body;

    // التحقق من وجود رقم العملية
    if (INPOT === undefined) {
        return res.status(400).json({ success: false, error: 'INPOT is required' });
    }

    try {
        const request = new sql.Request();

        // ربط المتغيرات مع الإجراء المخزن
        request.input('sch1', sql.Int, sch1 || 0);            // ScheduleID
        request.input('sch2', sql.Int, sch2);                 // SchoolID
        request.input('sch3', sql.Int, sch3);                 // CourseID
        request.input('sch4', sql.NVarChar(20), sch4 || '');  // DayOfWeek
        request.input('sch5', sql.NVarChar(50), sch5 || null); // StartTime (نرسله نص والـ SQL يحوله time)
        request.input('sch6', sql.NVarChar(50), sch6 || null); // EndTime
        request.input('INPOT', sql.Int, INPOT);               // 1=إضافة, 2=تعديل, 3=حذف

        // تنفيذ الإجراء
        await request.execute('INSER_UPDAT_DELETTAB_3int_1nvv_2tim');

        res.json({ success: true, message: 'تمت العملية بنجاح' });
    } catch (err) {
        console.error('خطأ في حفظ موعد الكورس:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API تسجيل الطلاب في الكورسات (Enrollments)
// يستخدم الإجراء المخزن: INSER_UPDAT_DELETTAB_5int_1nvv_1dat
// ==========================================================
app.post('/api/enrollments', async (req, res) => {
    // استلام البيانات من الفرونت إند
    const { sch1, sch2, sch3, sch4, sch5, sch6, sch7, INPOT } = req.body;
    // التحقق من وجود رقم العملية
    if (INPOT === undefined) {
        return res.status(400).json({ success: false, error: 'INPOT is required' });
    }

    try {
        const request = new sql.Request();

        // ربط المتغيرات مع الإجراء المخزن
        request.input('sch1', sql.Int, sch1 || 0);           // EnrollmentID
        request.input('sch2', sql.Int, sch2);                // SchoolID
        request.input('sch3', sql.Int, sch3);                // StudentID
        request.input('sch4', sql.Int, sch4);                // CourseID
        request.input('sch5', sql.Int, sch5);                // YearID
        request.input('sch6', sql.Date, sch6 || null);       // EnrollmentDate
        request.input('sch7', sql.NVarChar(50), sch7 || ''); // Status
        request.input('INPOT', sql.Int, INPOT);              // Process Type

        // تنفيذ الإجراء المخزن
        await request.execute('INSER_UPDAT_DELETTAB_5int_1nvv_1dat');

        res.json({ success: true, message: 'تم حفظ التسجيل بنجاح' });

    } catch (err) {
        console.error('خطأ في حفظ تسجيل الطالب:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API تسجيل وعرض حضور الطلاب (باستخدام الإجراء المخزن)
// ==========================================================
app.post('/api/attendance', async (req, res) => {
    // استقبال البيانات
    const { enrollmentId, attendanceDate, status, notes, schoolId, inpout } = req.body;

    // التحقق من الأساسيات
    if (!attendanceDate || !inpout) {
        return res.status(400).json({ success: false, error: 'التاريخ ونوع العملية (inpout) مطلوبان' });
    }

    try {
        const request = new sql.Request();

        // تمرير الباراميترات للإجراء المخزن Manage_Attendance
        // ملاحظة: الأسماء هنا يجب أن تطابق اللي في الـ Procedure
        request.input('EnrollmentID', sql.Int, enrollmentId || null);
        request.input('AttendanceDate', sql.Date, attendanceDate);
        request.input('Status', sql.NVarChar(50), status || null);
        request.input('Notes', sql.NVarChar(250), notes || null);
        request.input('SchoolID', sql.Int, schoolId || null);
        request.input('Action', sql.Int, inpout); // 1 = حفظ, 2 = عرض

        // تنفيذ الإجراء
        const result = await request.execute('Manage_Attendance');

        // الرد على الفرونت إند
        if (inpout === 2) {
            // في حالة العرض (Action 2) بنرجع الداتا
            res.json({ success: true, data: result.recordset });
        } else {
            // في حالة الحفظ (Action 1)
            res.json({ success: true, message: 'تم حفظ الحضور بنجاح' });
        }

    } catch (err) {
        console.error('SQL Attendance Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API تسجيل المدفوعات (إضافة / تعديل / حذف)
// يستخدم الإجراء المخزن: Manage_Payment
// ==========================================================
app.post('/api/payments', async (req, res) => {
    const { 
        paymentId,      // PaymentID (INT)
        enrollmentId,   // EnrollmentID (INT)
        paymentDate,    // PaymentDate (DATE)
        amount,         // Amount (DECIMAL)
        paymentMethod,  // PaymentMethod (NVARCHAR)
        isConfirmed,    // IsConfirmed (BIT)
        notes,          // Notes (NVARCHAR)
        action          // Action (INT): 1=إضافة, 2=تعديل, 3=حذف
    } = req.body;

    // التحقق من البيانات الأساسية (على الأقل رقم التسجيل ونوع العملية)
    if (!enrollmentId || !action) {
        return res.status(400).json({ success: false, error: 'البيانات الأساسية ناقصة (EnrollmentID, Action)' });
    }

    try {
        const request = new sql.Request();

        // ربط المتغيرات مع الإجراء المخزن
        request.input('PaymentID', sql.Int, paymentId || 0);
        request.input('EnrollmentID', sql.Int, enrollmentId);
        request.input('PaymentDate', sql.Date, paymentDate || null);
        request.input('Amount', sql.Decimal(10, 2), amount || 0);
        request.input('PaymentMethod', sql.NVarChar(50), paymentMethod || '');
        request.input('IsConfirmed', sql.Bit, isConfirmed ? 1 : 0); // تحويل القيمة إلى 0 أو 1
        request.input('Notes', sql.NVarChar(200), notes || null);
        request.input('Action', sql.Int, action);

        // تنفيذ الإجراء
        await request.execute('Manage_Payment');

        res.json({ success: true, message: 'تم حفظ الدفع بنجاح' });

    } catch (err) {
        console.error('خطأ في حفظ المدفوعات:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API إضافة شرح جديد (فيديو، صوت، صورة، PDF)
// ==========================================================
app.post('/api/explanations', upload.single('file'), async (req, res) => {
    const { courseId, EmploeID, schoolId, lessonTitle, contentTitle, type } = req.body;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ success: false, error: 'الملف مطلوب' });
    }
    if (!courseId || !EmploeID || !lessonTitle || !contentTitle) {
        return res.status(400).json({ success: false, error: 'البيانات الأساسية ناقصة' });
    }

    const fileUrl = `/uploads/${file.filename}`;

    try {
        const request = new sql.Request();
        request.input('CourseID', sql.Int, courseId);
        request.input('EmploeID', sql.Int, EmploeID);
        request.input('SchoolID', sql.Int, schoolId);
        request.input('LessonTitle', sql.NVarChar(200), lessonTitle);
        request.input('ContentTitle', sql.NVarChar(200), contentTitle);
        request.input('MediaType', sql.NVarChar(50), type);
        request.input('FileURL', sql.NVarChar(500), fileUrl);

        await request.execute('AddExplanation');

        res.json({ success: true, message: 'تم حفظ الشرح بنجاح' });

    } catch (err) {
        console.error('SQL Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================
// 🔹 API عرض الشروحات (للمعلم أو للطالب)
// ==========================================================
app.get('/api/explanations', async (req, res) => {
    const { courseId, schoolId, EmploeID } = req.query;

    try {
        const request = new sql.Request();
        request.input('CourseID', sql.Int, courseId || null);
        request.input('SchoolID', sql.Int, schoolId || null);
        request.input('EmploeID', sql.Int, EmploeID || null);

        const result = await request.execute('GetExplanations');

        res.json({ success: true, data: result.recordset });

    } catch (err) {
        console.error('SQL Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API إضافة واجب جديد
// ==========================================================
app.post('/api/homeworks', async (req, res) => {
    const { courseId, EmploeID, schoolId, title, questions } = req.body;
    // questions is array: [{text, a, b, c, d, ans}]
    
    try {
        const request = new sql.Request();
        request.input('CourseID', sql.Int, courseId);
        request.input('EmploeID', sql.Int, EmploeID);
        request.input('SchoolID', sql.Int, schoolId);
        request.input('Title', sql.NVarChar(200), title);
        request.input('QuestionsJSON', sql.NVarChar(sql.MAX), JSON.stringify(questions));

        const result = await request.execute('AddHomework');
        res.json({ success: true, message: 'تم إضافة الواجب بنجاح', data: result.recordset });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================
// 🔹 API جلب واجبات الطالب
// ==========================================================
app.get('/api/homeworks/student', async (req, res) => {
    const { studentId, schoolId } = req.query;
    try {
        const request = new sql.Request();
        request.input('StudentID', sql.Int, studentId);
        request.input('SchoolID', sql.Int, schoolId);
        const result = await request.execute('GetStudentHomeworks');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================
// 🔹 API جلب أسئلة الواجب (للحل)
// ==========================================================
app.get('/api/homeworks/:id/questions', async (req, res) => {
    const { id } = req.params;
    try {
        const request = new sql.Request();
        request.input('HomeworkID', sql.Int, id);
        const result = await request.execute('GetHomeworkForSolve');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================
// 🔹 API إرسال الإجابات
// ==========================================================
app.post('/api/homeworks/submit', async (req, res) => {
    const { homeworkId, studentId, answers } = req.body;
    // answers: [{qId: 1, ans: 'A'}, {qId: 2, ans: 'B'}]
    
    try {
        // 1. جلب الإجابات الصحيحة من الداتا بيز
        const reqQ = new sql.Request();
        reqQ.input('HomeworkID', sql.Int, homeworkId);
        const qResult = await reqQ.query('SELECT QuestionID, CorrectAnswer FROM HomeworkQuestions WHERE HomeworkID = @HomeworkID');
        const dbQuestions = qResult.recordset;

        // 2. حساب النتيجة
        let score = 0;
        answers.forEach(studentAns => {
            const q = dbQuestions.find(x => x.QuestionID === studentAns.qId);
            if (q && q.CorrectAnswer === studentAns.ans) score++;
        });

        // 3. حفظ النتيجة
        const reqSave = new sql.Request();
        reqSave.input('HomeworkID', sql.Int, homeworkId);
        reqSave.input('StudentID', sql.Int, studentId);
        reqSave.input('Score', sql.Int, score);
        reqSave.input('Total', sql.Int, dbQuestions.length);
        
        const saveResult = await reqSave.execute('SubmitHomeworkResult');

        res.json({ 
            success: true, 
            score: score, 
            total: dbQuestions.length,
            attempt: saveResult.recordset[0].Attempt
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API إنشاء اختبار جديد
// ==========================================================
app.post('/api/tests', async (req, res) => {
    const { courseId, EmploeID, schoolId, title, startDate, endDate, duration, questions } = req.body;

    if (!courseId || !title || !startDate || !endDate || !duration || !questions?.length) {
        return res.status(400).json({ success: false, message: 'بيانات ناقصة' });
    }

    try {
        // 1. حفظ بيانات الاختبار الأساسية
        const reqTest = new sql.Request();
        reqTest.input('Title', sql.NVarChar, title);
        reqTest.input('CourseID', sql.Int, courseId);
        reqTest.input('EmploeID', sql.Int, EmploeID);
        reqTest.input('SchoolID', sql.Int, schoolId);
        reqTest.input('StartDate', sql.DateTime, new Date(startDate)); // بداية السماح
        reqTest.input('EndDate', sql.DateTime, new Date(endDate));     // نهاية السماح
        reqTest.input('DurationMinutes', sql.Int, duration);

        const testResult = await reqTest.execute('CreateTest');
        const testId = testResult.recordset[0].NewTestID;

        // 2. حفظ الأسئلة
        for (const q of questions) {
            const reqQ = new sql.Request();
            reqQ.input('TestID', sql.Int, testId);
            reqQ.input('QuestionText', sql.NVarChar, q.text);
            reqQ.input('QuestionType', sql.NVarChar, q.type);
            // باقي الحقول...
            reqQ.input('OptionA', sql.NVarChar, q.type === 'tf' ? 'صح' : (q.a || null));
            reqQ.input('OptionB', sql.NVarChar, q.type === 'tf' ? 'خطأ' : (q.b || null));
            reqQ.input('OptionC', sql.NVarChar, q.c || null);
            reqQ.input('OptionD', sql.NVarChar, q.d || null);
            reqQ.input('CorrectAnswer', sql.NVarChar, q.ans);
            reqQ.input('Points', sql.Int, q.points || 1);

            await reqQ.execute('AddTestQuestion');
        }

        res.json({ success: true, testId: testId });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API جلب اختبارات الطالب
// ==========================================================
app.get('/api/tests/student', async (req, res) => {
    const { studentId, schoolId } = req.query;
    try {
        const request = new sql.Request();
        request.input('StudentID', sql.Int, studentId);
        request.input('SchoolID', sql.Int, schoolId);
        const result = await request.execute('GetStudentTests');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================
// 🔹 API جلب أسئلة الاختبار (للحل)
// ==========================================================
app.get('/api/tests/:id/questions', async (req, res) => {
    const { id } = req.params;
    try {
        const request = new sql.Request();
        request.input('TestID', sql.Int, id);
        const result = await request.execute('GetTestQuestionsForSolve');
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ==========================================================
// 🔹 API إرسال إجابات الاختبار
// ==========================================================
app.post('/api/tests/submit', async (req, res) => {
    const { testId, studentId, answers } = req.body; // answers: [{qId, ans}]
    
    try {
        // 1. جلب الإجابات الصحيحة والدرجات
        const reqQ = new sql.Request();
        reqQ.input('TestID', sql.Int, testId);
        const qResult = await reqQ.query('SELECT QuestionID, CorrectAnswer, Points FROM TestQuestions WHERE TestID = @TestID');
        const dbQuestions = qResult.recordset;

        // 2. حساب الدرجة
        let totalScore = 0;
        let maxScore = 0;

        dbQuestions.forEach(q => {
            maxScore += q.Points; // حساب المجموع الكلي
            
            // تم تصحيح السطر التالي: إزالة : any
            const studentAns = answers.find(a => a.qId === q.QuestionID);
            
            // مقارنة الإجابة
            if (studentAns && studentAns.ans === q.CorrectAnswer) {
                totalScore += q.Points;
            }
        });

        // 3. حفظ النتيجة
        const reqSave = new sql.Request();
        reqSave.input('TestID', sql.Int, testId);
        reqSave.input('StudentID', sql.Int, studentId);
        reqSave.input('Score', sql.Int, totalScore);
        reqSave.input('TotalPoints', sql.Int, maxScore);
        
        await reqSave.query(`
            INSERT INTO TestResults (TestID, StudentID, Score, TotalPoints)
            VALUES (@TestID, @StudentID, @Score, @TotalPoints)
        `);

        res.json({ 
            success: true, 
            score: totalScore, 
            total: maxScore
        });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 API ترحيل الطلاب للعام الجديد
// يستخدم الإجراء المخزن: TransferStudentsToNextYear
// ==========================================================
app.post('/api/students/transfer', async (req, res) => {
    const { 
        SchoolID, 
        CurrentYearID, NextYearID, 
        CurrentMrahelID, NextMrahelID, 
        CurrentGereadID, NextGereadID, 
        SelectedStudentIDs // نص مفصول بفواصل (String)
    } = req.body;

    // التحقق من البيانات الأساسية
    if (!SchoolID || !CurrentYearID || !NextYearID || !SelectedStudentIDs) {
        return res.status(400).json({ 
            success: false, 
            error: 'البيانات الأساسية للترحيل ناقصة (المدرسة، السنوات، الطلاب)' 
        });
    }

    try {
        const request = new sql.Request();
        
        // تمرير المتغيرات للإجراء المخزن
        request.input('CurrentYearID', sql.Int, CurrentYearID);
        request.input('NextYearID', sql.Int, NextYearID);
        request.input('CurrentMrahelID', sql.Int, CurrentMrahelID);
        request.input('CurrentGereadID', sql.Int, CurrentGereadID);
        request.input('NextMrahelID', sql.Int, NextMrahelID);
        request.input('NextGereadID', sql.Int, NextGereadID);
        request.input('SchoolID', sql.Int, SchoolID);
        request.input('SelectedStudentIDs', sql.NVarChar(sql.MAX), SelectedStudentIDs);

        // تنفيذ الإجراء
        const result = await request.execute('TransferStudentsToNextYear');

       
        if (result.recordset && result.recordset.length > 0) {
            const firstRow = result.recordset[0];
            
            // إذا كان العمود الأول اسمه 'رسالة'، فهذا يعني وجود ملاحظة أو خطأ
            if (firstRow.رسالة) {
                return res.json({ 
                    success: false, 
                    message: firstRow.رسالة 
                });
            }
            
            // إذا لم يكن هناك عمود رسالة، فهذا يعني نجاح الترحيل (يرجع أسماء الطلاب)
            res.json({ 
                success: true, 
                message: `تم ترحيل ${result.recordset.length} طالب بنجاح.`,
                data: result.recordset 
            });
        } else {
            // حالة نادرة: لم يرجع الإجراء شيئاً
            res.json({ 
                success: true, 
                message: 'تم تنفيذ الأمر، ولكن لم تصل بيانات تأكيد.' 
            });
        }

    } catch (err) {
        console.error('SQL Transfer Error:', err);
        res.status(500).json({ 
            success: false, 
            error: 'خطأ في السيرفر أثناء الترحيل: ' + err.message 
        });
    }
});

// الجداول المدرسى 
// Route لعمليات الحصص (إضافة - تعديل - حذف)
app.post('/api/period', async (req, res) => {
    try {
        const { id, name, startTime, endTime, inpot } = req.body;

        if (!inpot) {
            return res.status(400).json({ success: false, message: 'بيانات ناقصة' });
        }

        const request = new sql.Request();
        
        // === التعديل الهام هنا ===
        // إذا كانت العملية حذف، نجبر قيم الوقت على أن تكون null لتجنب خطأ التحويل
        let finalStartTime = startTime;
        let finalEndTime = endTime;

        if (inpot == 3) {
            finalStartTime = null;
            finalEndTime = null;
        }
        // =========================

        request.input('sch1', sql.Int, id || 0); 
        request.input('sch2', sql.NVarChar(100), name || ''); 
        request.input('sch3', sql.NVarChar(10), finalStartTime); 
        request.input('sch4', sql.NVarChar(10), finalEndTime); 
        request.input('INPOT', sql.Int, inpot);

        const result = await request.execute('INSER_UPDAT_DELETTAB_1int_1nvv_2tim');

        if (inpot == 1) res.json({ success: true, message: 'تمت إضافة الحصة بنجاح' });
        else if (inpot == 2) res.json({ success: true, message: 'تم تعديل الحصة بنجاح' });
        else if (inpot == 3) res.json({ success: true, message: 'تم حذف الحصة بنجاح' });

    } catch (error) {
        console.error("خطأ:", error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم', error: error.message });
    }
});
// Endpoint لتخصيص الحصص للمعلمين
app.post('/api/teacherAssignment', async (req, res) => {
    try {
        const { id, teacherId, subjectId, classId, periods, inpot } = req.body;

        if (!inpot) {
            return res.status(400).json({ success: false, message: 'بيانات ناقصة' });
        }

        const request = new sql.Request();
        
        // ربط المتغيرات مع الباراميترز في الإجراء المخزن
        request.input('sch1', sql.Int, id || 0);          // AssignmentID
        request.input('sch2', sql.Int, teacherId || 0);  // EmploeID
        request.input('sch3', sql.Int, subjectId || 0);  // SabgektID
        request.input('sch4', sql.Int, classId || 0);    // ClasesID
        request.input('sch5', sql.Int, periods || 0);    // RequiredPeriods
        request.input('INPOT', sql.Int, inpot);

        // تنفيذ الإجراء
        const result = await request.execute('INSER_UPDAT_DELETTAB_5int');

        // الإجراء المخزن يعيد صف واحد يحتوي على عمود اسمه Result
        // 1 = نجاح
        // -1 = مكرر
        // -2 = تجاوز النصاب
        if (result.recordset && result.recordset.length > 0) {
            const dbResult = result.recordset[0].Result;

            if (dbResult === 1) {
                res.json({ success: true, message: 'تمت العملية بنجاح' });
            } else if (dbResult === -1) {
                res.json({ success: false, message: 'خطأ: هذا التخصيص موجود مسبقاً لنفس المعلم والمادة والفصل' });
            } else if (dbResult === -2) {
                res.json({ success: false, message: 'خطأ: عدد الحصص يتجاوز النصاب المسموح به لهذا المعلم' });
            } else {
                res.json({ success: false, message: 'فشلت العملية في قاعدة البيانات' });
            }
        } else {
            res.json({ success: false, message: 'لم يتم إرجاع نتيجة من قاعدة البيانات' });
        }

    } catch (error) {
        console.error("Error in teacherAssignment API:", error);
        res.status(500).json({ success: false, message: 'حدث خطأ في الخادم', error: error.message });
    }
});

app.post('/api/saveTimetable', async (req, res) => {
    // التحقق من وجود البيانات
    if (!req.body.schedule || !Array.isArray(req.body.schedule) || req.body.schedule.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'لا توجد بيانات جدول صالحة للحفظ'
        });
    }

    try {
        const request = new sql.Request();
        
        // تحويل المصفوفة إلى نص JSON لإرساله للـ Stored Procedure
        const jsonString = JSON.stringify(req.body.schedule);
        
        request.input('ScheduleData', sql.NVarChar(sql.MAX), jsonString);

        // تنفيذ الإجراء المخزن
        const result = await request.execute('SP_GenerateTimetable');

        // التحقق من نجاح العملية
        const insertedCount = result.recordset[0]?.InsertedRows || 0;

        res.json({
            success: true,
            message: `تم إنشاء الجدول وحفظ ${insertedCount} حصة بنجاح!`,
            count: insertedCount
        });

    } catch (err) {
        console.error('خطأ في حفظ الجدول:', err);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء حفظ الجدول في قاعدة البيانات',
            error: err.message
        });
    }
});
app.post('/api/savePracticalSubjects', async (req, res) => {
    const { subjectIds } = req.body;
    if (!Array.isArray(subjectIds)) {
        return res.status(400).json({ success: false, message: 'بيانات غير صحيحة' });
    }

    try {
        const request = new sql.Request();
        // مسح القديم
        await request.query('TRUNCATE TABLE [dbo].[PracticalSubjects]');
        
        // إدخال الجديد
        for (const id of subjectIds) {
            await request.query(`INSERT INTO [dbo].[PracticalSubjects] (SubjectID) VALUES (${id})`);
        }

        res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});
// ============================
// API للفحص: جلب البيانات بغض النظر عن رقم المدرسة
// ============================
app.get('/api/bell/debug', async (req, res) => {
    try {
        const request = new sql.Request();
        
        // 1. التحقق من عدد الحصص
        const periodsCount = await request.query('SELECT COUNT(*) as count FROM Periods');
        console.log("عدد الحصص:", periodsCount.recordset[0].count);

        // 2. التحقق من عدد الأصوات
        const soundsCount = await request.query('SELECT COUNT(*) as count FROM BellSettings');
        console.log("عدد الأصوات:", soundsCount.recordset[0].count);

        // 3. جلب البيانات مع الـ Join (بدون شرط SchoolID)
        // إذا لم يرجع شيئاً، فهذا يعني أن جدول Periods فارغ
        const result = await request.query(`
            SELECT 
                BS.PeriodID,
                BS.SoundURL,
                P.PeriodName,
                P.StartTime,
                P.EndTime
            FROM BellSettings BS
            INNER JOIN Periods P ON BS.PeriodID = P.PeriodID
            ORDER BY P.StartTime
        `);

        console.log("النتيجة:", result.recordset);

        res.json({ 
            success: true, 
            periodsCount: periodsCount.recordset[0].count,
            soundsCount: soundsCount.recordset[0].count,
            data: result.recordset 
        });
    } catch (err) {
        console.error('Debug Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ============================
// 1. API لإدارة الأصوات (إضافة - تعديل - حذف)
// يستخدم الإجراء المخزن INSER_UPDAT_DELETTAB_BellSounds
// ============================
app.post('/api/bell/manage', upload.single('sound'), async (req, res) => {
    const { schoolId, periodId, operation } = req.body;
    const file = req.file;

    if (!schoolId || !periodId || !operation) {
        return res.status(400).json({ success: false, message: 'بيانات ناقصة (المدرسة، الحصة، العملية)' });
    }

    try {
        const request = new sql.Request();

        // رابط الملف المرفوع
        const fileUrl = file ? `/uploads/${file.filename}` : null;

        // تمرير المتغيرات للإجراء المخزن
        request.input('SchoolID', sql.Int, schoolId);
        request.input('PeriodID', sql.Int, periodId);
        request.input('SoundURL', sql.NVarChar(500), fileUrl);
        request.input('INPOT', sql.Int, operation); // 1=Add, 2=Edit, 3=Delete

        // تنفيذ الإجراء المخزن
        await request.execute('INSER_UPDAT_DELETTAB_BellSounds');

        res.json({ success: true, message: 'تمت العملية بنجاح', url: fileUrl });

    } catch (err) {
        console.error('خطأ في إدارة الأصوات:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================
// 2. API لعرض الأصوات (Join مع جدول الحصص)
// يستخدم الإجراء المخزن GetBellSoundSettings
// ============================
app.get('/api/bell/sounds', async (req, res) => {
    const { schoolId } = req.query;

    if (!schoolId) {
        return res.status(400).json({ success: false, message: 'رقم المدرسة مطلوب' });
    }

    try {
        const request = new sql.Request();
        request.input('SchoolID', sql.Int, schoolId);

        const result = await request.execute('GetBellSoundSettings');
        
        res.json({ success: true, data: result.recordset });
    } catch (err) {
        console.error('خطأ في جلب الأصوات:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// ==========================================================
// 🔹 تشغيل السيرفر (تم التصحيح للعمل على الشبكة)
// ==========================================================
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // 1. الاتصال بقاعدة البيانات أولاً
        console.log('🔄 جاري الاتصال بقاعدة البيانات...');
        await sql.connect(dbConfig);
        console.log('✅ متصل بقاعدة البيانات بنجاح!');

        // 2. تشغيل السيرفر بعد نجاح الاتصال
        // ✅ تمت إضافة '0.0.0.0' لاستقبال الاتصالات من الشبكة المحلية
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 السيرفر شغال على البورت: ${PORT}`);
        });

    } catch (err) {
        console.error('❌ خطأ في الاتصال بقاعدة البيانات:', err);
        // إنهاء العملية إذا فشل الاتصال لأن السيرفر لن يعمل بدون داتا بيز
        process.exit(1);
    }
};

startServer();
