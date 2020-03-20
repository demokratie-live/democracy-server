import { Schema, Document } from 'mongoose';

export interface IVerification extends Document {
  phoneHash: string;
  verifications: [
    {
      deviceHash: String;
      oldPhoneHash: String;
      codes: [
        {
          code: String;
          time: String;
          SMSID?: string;
        },
      ];
      SMSStatus: number;
      expires: string;
    },
  ];
}

const VerificationSchema = new Schema(
  {
    phoneHash: { type: String, required: true, unique: true },
    verifications: [
      {
        deviceHash: String,
        oldPhoneHash: String,
        codes: [
          {
            code: { type: String, required: true },
            time: { type: Date, required: true },
            SMSID: { type: String, default: null },
          },
        ],
        SMSStatus: { type: Number },
        expires: { type: Date, required: true },
      },
    ],
  },
  { timestamps: true },
);

export default VerificationSchema;
