import jwt from 'jsonwebtoken';
import db from '../models';

exports.emailpasswordreset = async (req: { body: { email: any; }; }, res: { status: (arg0: number) => { (): any; new(): any; send: { (arg0: { error: unknown; }): any; new(): any; }; }; json: (arg0: { token: string; loggedIn: boolean; id: any; }) => any; }) => {
  const { email } = req.body;
  const Users = (db).Users;
  try {
    const user = await Users.findOne({ where: { email } });

    const secret = process.env.JWT_SECRET || 'JWT SECRET';

    const token = jwt.sign({ id: user.id }, secret);

    if (!email) {
      // Return 400 error message (User doesn't exists)
      return res.status(400).send({ error: 'Email does not exist' });
    }
    return res.json({
      token, loggedIn: true, id: user.id,
    });
  } catch (err) {
    return res.status(400).send({ error: err });
  }
};